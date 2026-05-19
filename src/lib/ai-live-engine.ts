// Engine de IA "ao vivo" que opera no módulo simulado usando dados reais (Binance).
// Lê candles de mercado, gera sinais quant, abre/fecha ordens paper e mantém
// uma memória de aprendizado em localStorage para ajustar a confiança com base
// no histórico de vitórias/derrotas por estratégia + ativo.

import type { AISignal, ChartPoint, PaperOrder, Trade } from "./types";
import { fetchLiveCandles } from "./market-live";

const MEM_KEY = "autotrade.ai.memory.v1";

export interface LearningStats {
  // chave = `${asset}::${strategy}` -> contadores
  [key: string]: { wins: number; losses: number; lastConfidence: number };
}

export function loadMemory(): LearningStats {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(MEM_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function saveMemory(m: LearningStats) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MEM_KEY, JSON.stringify(m));
}

export function recordOutcome(asset: string, strategy: string, win: boolean, confidence: number) {
  const mem = loadMemory();
  const k = `${asset}::${strategy}`;
  const cur = mem[k] ?? { wins: 0, losses: 0, lastConfidence: confidence };
  if (win) cur.wins += 1;
  else cur.losses += 1;
  cur.lastConfidence = confidence;
  mem[k] = cur;
  saveMemory(mem);
}

export function getWinRate(asset: string, strategy: string): number | null {
  const mem = loadMemory();
  const k = `${asset}::${strategy}`;
  const s = mem[k];
  if (!s) return null;
  const n = s.wins + s.losses;
  if (n < 3) return null;
  return s.wins / n;
}

// === Análise quantitativa (rodando no navegador) ===

function sma(values: number[], n: number): number {
  if (values.length < n) return values[values.length - 1] ?? 0;
  const slice = values.slice(-n);
  return slice.reduce((a, b) => a + b, 0) / n;
}

function rsi(values: number[], period = 14): number {
  if (values.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function stddev(values: number[], n: number): number {
  const slice = values.slice(-n);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length;
  return Math.sqrt(variance);
}

export interface LiveSignalOutput extends AISignal {
  qty: number;
}

export function analyzeCandles(asset: string, candles: ChartPoint[]): LiveSignalOutput | null {
  if (candles.length < 30) return null;
  const closes = candles.map((c) => c.close ?? c.price ?? 0).filter(Boolean);
  const last = closes[closes.length - 1];
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, Math.min(50, closes.length));
  const r = rsi(closes);
  const vol = stddev(closes, 20) / last;

  let kind: "BUY" | "SELL" | "WAIT" = "WAIT";
  let strategy = "Aguardando setup";
  let trend: "uptrend" | "downtrend" | "sideways" = "sideways";
  let confidence = 40;

  if (sma20 > sma50 * 1.001 && r < 70 && r > 45) {
    kind = "BUY";
    strategy = "Momentum + MA Cross";
    trend = "uptrend";
    confidence = 55 + Math.min(20, (sma20 / sma50 - 1) * 1500);
  } else if (sma20 < sma50 * 0.999 && r > 30 && r < 55) {
    kind = "SELL";
    strategy = "Trend Down + MA Cross";
    trend = "downtrend";
    confidence = 55 + Math.min(20, (1 - sma20 / sma50) * 1500);
  } else if (r < 28) {
    kind = "BUY";
    strategy = "RSI Oversold";
    confidence = 60;
  } else if (r > 72) {
    kind = "SELL";
    strategy = "RSI Overbought";
    confidence = 60;
  }

  // Aprendizado: ajusta confiança pelo win-rate histórico do par ativo+estratégia
  const wr = getWinRate(asset, strategy);
  if (wr !== null) {
    const delta = (wr - 0.5) * 30; // -15..+15
    confidence = Math.max(20, Math.min(95, confidence + delta));
  }

  const stopPct = Math.max(0.005, vol * 1.2);
  const targetPct = stopPct * 1.8; // R:R 1.8

  const entry = +last.toFixed(asset === "EURUSD" ? 5 : 2);
  const stop = +(kind === "BUY" ? entry * (1 - stopPct) : entry * (1 + stopPct)).toFixed(
    asset === "EURUSD" ? 5 : 2,
  );
  const target = +(kind === "BUY" ? entry * (1 + targetPct) : entry * (1 - targetPct)).toFixed(
    asset === "EURUSD" ? 5 : 2,
  );

  return {
    id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    asset,
    kind,
    confidence: Math.round(confidence),
    entry,
    stop,
    target,
    trend,
    volatility: vol > 0.02 ? "high" : vol > 0.008 ? "medium" : "low",
    strategy,
    rationale: `Análise ao vivo · SMA20=${sma20.toFixed(2)} SMA50=${sma50.toFixed(2)} RSI=${r.toFixed(1)} vol=${(vol * 100).toFixed(2)}%${wr !== null ? ` · winrate hist=${(wr * 100).toFixed(0)}%` : ""}`,
    createdAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    qty: asset.startsWith("BTC") ? 0.02 : asset.startsWith("ETH") ? 0.3 : asset.startsWith("SOL") ? 5 : 1,
  };
}

export async function fetchSignalForAsset(asset: string, tf = "5m"): Promise<LiveSignalOutput | null> {
  const candles = await fetchLiveCandles(asset, tf, 80);
  return analyzeCandles(asset, candles);
}

export function updateOrderWithPrice(order: PaperOrder, price: number): { order: PaperOrder; closed?: Trade } {
  const dir = order.side === "BUY" ? 1 : -1;
  const pnl = +((price - order.entry) * order.qty * dir).toFixed(2);
  const next: PaperOrder = { ...order, current: price, pnl };

  const hitStop = order.side === "BUY" ? price <= order.stop : price >= order.stop;
  const hitTarget = order.side === "BUY" ? price >= order.target : price <= order.target;

  if (hitStop || hitTarget) {
    const exit = hitTarget ? order.target : order.stop;
    const finalPnl = +((exit - order.entry) * order.qty * dir).toFixed(2);
    const trade: Trade = {
      id: `tr-${order.id}`,
      asset: order.asset,
      side: order.side,
      entry: order.entry,
      exit,
      qty: order.qty,
      pnl: finalPnl,
      result: finalPnl >= 0 ? "WIN" : "LOSS",
      strategy: "AI Live",
      closedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };
    return { order: { ...next, status: "CLOSED", pnl: finalPnl, current: exit }, closed: trade };
  }
  return { order: next };
}
