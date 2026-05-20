// Cliente público para candles em tempo real (Binance) com fallback determinístico.
// Não requer Supabase: chamado direto do navegador.

import type { ChartPoint } from "./types";

const TF_TO_BINANCE: Record<string, string> = {
  "1m": "1m",
  "3m": "3m",
  "5m": "5m",
  "15m": "15m",
  "30m": "30m",
  "1h": "1h",
  "4h": "4h",
  "1d": "1d",
};

const TF_TO_MS: Record<string, number> = {
  "1m": 60_000,
  "3m": 3 * 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "30m": 30 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

function toBinanceSymbol(asset: string): string | null {
  // Apenas pares cripto contra USDT são suportados pela Binance pública.
  if (!asset.includes("/")) return null;
  const [base, quote] = asset.split("/");
  if (quote !== "USDT") return null;
  return `${base}${quote}`.toUpperCase();
}

function formatTime(ts: number, tf: string): string {
  const d = new Date(ts);
  if (tf === "1d") {
    return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export async function fetchLiveCandles(
  asset: string,
  timeframe: string,
  limit = 120,
): Promise<ChartPoint[]> {
  const symbol = toBinanceSymbol(asset);
  const interval = TF_TO_BINANCE[timeframe] ?? "1h";

  if (symbol) {
    try {
      const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as unknown[][];
        return data.map((k) => {
          const openTime = Number(k[0]);
          const open = Number(k[1]);
          const high = Number(k[2]);
          const low = Number(k[3]);
          const close = Number(k[4]);
          const volume = Number(k[5]);
          return {
            t: openTime,
            time: formatTime(openTime, timeframe),
            open,
            high,
            low,
            close,
            price: close,
            volume,
          };
        });
      }
    } catch (err) {
      console.warn("[market-live] Binance falhou, usando fallback", err);
    }
  }

  return synthesize(asset, timeframe, limit);
}

// Fallback determinístico (varia por ativo + timeframe).
function synthesize(asset: string, timeframe: string, count: number): ChartPoint[] {
  const seed = asset.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const tfMs = TF_TO_MS[timeframe] ?? 60 * 60_000;
  const tfSeed = Object.keys(TF_TO_MS).indexOf(timeframe) + 1;

  const basePrice = asset.startsWith("BTC")
    ? 65000
    : asset.startsWith("ETH")
      ? 3400
      : asset.startsWith("SOL")
        ? 140
        : asset === "AAPL"
          ? 225
          : asset === "TSLA"
            ? 240
            : asset === "NVDA"
              ? 880
              : asset === "EURUSD"
                ? 1.08
                : 100;

  // Amplitude da onda muda com o timeframe (1m é mais ruidoso, 1d mais suave).
  const amp = basePrice * (0.002 + tfSeed * 0.003);
  const now = Date.now();
  let price = basePrice;
  const candles: ChartPoint[] = [];

  for (let i = 0; i < count; i++) {
    const noise = Math.sin((seed + i * tfSeed) / 4) * amp;
    const drift = Math.cos((seed + i) / 8) * (amp * 0.5);
    const open = price;
    const close = +(price + noise + drift).toFixed(asset === "EURUSD" ? 5 : 2);
    const high = +Math.max(open, close) + amp * 0.3;
    const low = +Math.min(open, close) - amp * 0.3;
    const ts = now - (count - i) * tfMs;
    candles.push({
      t: ts,
      time: formatTime(ts, timeframe),
      open: +open.toFixed(asset === "EURUSD" ? 5 : 2),
      close,
      high: +high.toFixed(asset === "EURUSD" ? 5 : 2),
      low: +low.toFixed(asset === "EURUSD" ? 5 : 2),
      price: close,
      volume: Math.round(500 + ((seed + i) % 800)),
    });
    price = close;
  }
  return candles;
}
