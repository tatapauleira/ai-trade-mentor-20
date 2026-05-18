import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient, getUserIdFromRequest } from "../_shared/supabase.ts";
import { generateSignalFromCandles } from "../_shared/analysis.ts";
import { validateRisk } from "../_shared/risk.ts";
import type { AISignalResponse, Candle } from "../_shared/types.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return jsonResponse({ error: "Não autorizado" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const assetSymbol = (body.asset ?? "BTCUSDT").toString().toUpperCase().replace("/", "");
    const timeframe = (body.timeframe ?? "1h").toString();

    const supabase = createServiceClient();

    const { data: asset, error: assetError } = await supabase
      .from("assets")
      .select("id, symbol")
      .eq("symbol", assetSymbol)
      .single();

    if (assetError || !asset) {
      return jsonResponse({ error: `Ativo não encontrado: ${assetSymbol}` }, 404);
    }

    const { data: candlesRaw } = await supabase
      .from("market_candles")
      .select("open, high, low, close, volume, candle_time")
      .eq("asset_id", asset.id)
      .eq("timeframe", timeframe)
      .order("candle_time", { ascending: true })
      .limit(100);

    let candles: Candle[] = (candlesRaw ?? []).map((c) => ({
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number(c.volume),
      candle_time: c.candle_time,
    }));

    if (candles.length < 20) {
      candles = synthesizeCandles(assetSymbol, 60);
    }

    const generated = generateSignalFromCandles(candles);
    const riskCheck = await validateRisk(
      supabase,
      userId,
      generated.risk_percent,
      generated.signal,
    );

    const blocked = !riskCheck.allowed && generated.signal !== "WAIT";
    const blockReason = blocked ? riskCheck.reason : null;

    const response: AISignalResponse = {
      asset: assetSymbol,
      signal: generated.signal,
      confidence: generated.confidence,
      entry: generated.entry,
      stop_loss: generated.stop_loss,
      take_profit: generated.take_profit,
      risk_percent: generated.risk_percent,
      strategy: generated.strategy,
      market_regime: generated.market_regime,
      reason: generated.reason,
      blocked,
      block_reason: blockReason ?? undefined,
    };

    const { data: saved, error: saveError } = await supabase
      .from("ai_signals")
      .insert({
        user_id: userId,
        asset_id: asset.id,
        signal: generated.signal,
        confidence: generated.confidence,
        entry: generated.entry,
        stop_loss: generated.stop_loss,
        take_profit: generated.take_profit,
        risk_percent: generated.risk_percent,
        strategy: generated.strategy,
        market_regime: generated.market_regime,
        reason: generated.reason,
        blocked,
        block_reason: blockReason,
        raw_response: response,
      })
      .select("id")
      .single();

    if (saveError) {
      console.error("Erro ao salvar sinal:", saveError);
      return jsonResponse({ error: "Falha ao persistir sinal" }, 500);
    }

    response.signal_id = saved.id;

    await supabase.from("ai_learning_logs").insert({
      user_id: userId,
      signal_id: saved.id,
      decision: blocked ? "BLOCKED" : "GENERATED",
      outcome: generated.signal,
      feedback: blockReason ?? generated.reason,
      metadata: { asset: assetSymbol, timeframe, response },
    });

    return jsonResponse(response);
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

function synthesizeCandles(symbol: string, count: number): Candle[] {
  const seed = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  let price = symbol.startsWith("BTC") ? 42000 : symbol.startsWith("ETH") ? 2300 : 100;
  const candles: Candle[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const noise = Math.sin((seed + i) / 4) * (price * 0.008);
    const open = price;
    const close = price + noise + (Math.random() - 0.5) * price * 0.002;
    const high = Math.max(open, close) + Math.abs(noise) * 0.3;
    const low = Math.min(open, close) - Math.abs(noise) * 0.3;
    candles.push({
      open,
      high,
      low,
      close,
      volume: 800 + Math.random() * 1200,
      candle_time: new Date(now - (count - i) * 3600000).toISOString(),
    });
    price = close;
  }
  return candles;
}
