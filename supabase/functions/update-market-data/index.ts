import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = await req.json().catch(() => ({}));
    const symbols: string[] = body.symbols
      ? body.symbols.map((s: string) => s.toUpperCase().replace("/", ""))
      : ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
    const timeframe = (body.timeframe ?? "1h").toString();
    const limit = Math.min(Number(body.limit ?? 50), 200);

    const supabase = createServiceClient();
    const updated: Array<{ symbol: string; candles: number }> = [];

    for (const symbol of symbols) {
      const { data: asset } = await supabase
        .from("assets")
        .select("id, symbol, asset_class")
        .eq("symbol", symbol)
        .single();

      if (!asset) continue;

      const candles = await fetchCandles(symbol, asset.asset_class, limit);
      if (!candles.length) continue;

      const rows = candles.map((c) => ({
        asset_id: asset.id,
        timeframe,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        candle_time: c.candle_time,
      }));

      const { error } = await supabase
        .from("market_candles")
        .upsert(rows, { onConflict: "asset_id,timeframe,candle_time" });

      if (error) {
        console.error(`Erro ao salvar candles ${symbol}:`, error);
        continue;
      }

      updated.push({ symbol, candles: rows.length });

      await updateOpenPaperOrders(supabase, asset.id, candles[candles.length - 1].close);
    }

    return jsonResponse({
      success: true,
      updated,
      message: "Dados de mercado atualizados (paper trading / simulação).",
    });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

interface RawCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  candle_time: string;
}

async function fetchCandles(
  symbol: string,
  assetClass: string,
  limit: number,
): Promise<RawCandle[]> {
  if (assetClass === "crypto") {
    try {
      const url =
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=${limit}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Binance ${res.status}`);
      const data = await res.json();
      return (data as number[][]).map((k) => ({
        open: Number(k[1]),
        high: Number(k[2]),
        low: Number(k[3]),
        close: Number(k[4]),
        volume: Number(k[5]),
        candle_time: new Date(k[0]).toISOString(),
      }));
    } catch (e) {
      console.warn(`Binance falhou para ${symbol}:`, e);
    }
  }

  return synthesizeCandles(symbol, limit);
}

function synthesizeCandles(symbol: string, count: number): RawCandle[] {
  const seed = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  let price = symbol.startsWith("BTC") ? 65000 : symbol.startsWith("ETH") ? 3400 : 140;
  const candles: RawCandle[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const noise = Math.sin((seed + i) / 5) * (price * 0.006);
    const open = price;
    const close = price + noise;
    candles.push({
      open: +open.toFixed(8),
      high: +(Math.max(open, close) * 1.003).toFixed(8),
      low: +(Math.min(open, close) * 0.997).toFixed(8),
      close: +close.toFixed(8),
      volume: +(500 + Math.random() * 800).toFixed(2),
      candle_time: new Date(now - (count - i) * 3600000).toISOString(),
    });
    price = close;
  }
  return candles;
}

async function updateOpenPaperOrders(
  supabase: ReturnType<typeof createServiceClient>,
  assetId: string,
  currentPrice: number,
) {
  const { data: orders } = await supabase
    .from("paper_orders")
    .select("id, side, entry_price, qty")
    .eq("asset_id", assetId)
    .eq("status", "OPEN");

  for (const order of orders ?? []) {
    const entry = Number(order.entry_price);
    const qty = Number(order.qty);
    const pnl =
      order.side === "BUY"
        ? (currentPrice - entry) * qty
        : (entry - currentPrice) * qty;

    await supabase
      .from("paper_orders")
      .update({ current_price: currentPrice, pnl: +pnl.toFixed(2) })
      .eq("id", order.id);
  }
}
