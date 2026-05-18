// Fallback quando Supabase não está configurado ou sem sessão.
export type { AISignal, PaperOrder, Trade, Strategy, SignalKind } from "./types";

import type { AISignal, PaperOrder, Strategy, Trade } from "./types";

export const mockEquityCurve = Array.from({ length: 60 }, (_, i) => {
  const base = 10000;
  const drift = i * 38;
  const noise = Math.sin(i / 3) * 280 + Math.cos(i / 5) * 180;
  return {
    day: `D${i + 1}`,
    equity: Math.round(base + drift + noise),
  };
});

// Pseudo-random determinístico (SSR-safe, sem Math.random no escopo de módulo)
const rand = (i: number, salt = 1) => {
  const x = Math.sin(i * 9301 + salt * 49297) * 233280;
  return x - Math.floor(x);
};

export const mockPriceCandles = Array.from({ length: 80 }, (_, i) => {
  const base = 42000 + Math.sin(i / 4) * 900 + i * 12;
  const open = base + rand(i, 1) * 80 - 40;
  const close = base + rand(i, 2) * 120 - 60;
  return {
    t: i,
    time: `${String(9 + Math.floor(i / 12)).padStart(2, "0")}:${String((i * 5) % 60).padStart(2, "0")}`,
    open: +open.toFixed(2),
    close: +close.toFixed(2),
    high: +(Math.max(open, close) + rand(i, 3) * 60).toFixed(2),
    low: +(Math.min(open, close) - rand(i, 4) * 60).toFixed(2),
    price: +close.toFixed(2),
    volume: Math.round(800 + rand(i, 5) * 1200),
  };
});

export const mockSignals: AISignal[] = [
  {
    id: "s1",
    asset: "BTC/USDT",
    kind: "BUY",
    confidence: 78,
    entry: 42850,
    stop: 42300,
    target: 43900,
    trend: "uptrend",
    volatility: "medium",
    strategy: "Breakout + Momentum",
    rationale: "Rompimento da máxima de 4h com expansão de volume e RSI saindo de zona neutra.",
    createdAt: "2 min atrás",
  },
  {
    id: "s2",
    asset: "ETH/USDT",
    kind: "WAIT",
    confidence: 41,
    entry: 2310,
    stop: 2275,
    target: 2380,
    trend: "sideways",
    volatility: "low",
    strategy: "Mean Reversion",
    rationale: "Mercado lateral sem catalisador claro. Aguardar definição.",
    createdAt: "8 min atrás",
  },
  {
    id: "s3",
    asset: "SOL/USDT",
    kind: "SELL",
    confidence: 69,
    entry: 142.8,
    stop: 145.2,
    target: 137.5,
    trend: "downtrend",
    volatility: "high",
    strategy: "RSI Reversion",
    rationale: "Divergência baixista no RSI 14 com rejeição em resistência.",
    createdAt: "14 min atrás",
  },
  {
    id: "s4",
    asset: "AAPL",
    kind: "BUY",
    confidence: 64,
    entry: 224.1,
    stop: 221.5,
    target: 229.8,
    trend: "uptrend",
    volatility: "low",
    strategy: "Moving Average Cross",
    rationale: "Cruzamento MM20/MM50 confirmado com volume acima da média.",
    createdAt: "22 min atrás",
  },
];

export const mockPaperOrders: PaperOrder[] = [
  {
    id: "p1",
    asset: "BTC/USDT",
    side: "BUY",
    qty: 0.12,
    entry: 42100,
    current: 42850,
    stop: 41600,
    target: 43500,
    pnl: 90,
    status: "OPEN",
    openedAt: "10:24",
  },
  {
    id: "p2",
    asset: "ETH/USDT",
    side: "BUY",
    qty: 1.5,
    entry: 2290,
    current: 2310,
    stop: 2255,
    target: 2370,
    pnl: 30,
    status: "OPEN",
    openedAt: "10:48",
  },
  {
    id: "p3",
    asset: "SOL/USDT",
    side: "SELL",
    qty: 8,
    entry: 143.5,
    current: 142.8,
    stop: 145.5,
    target: 138,
    pnl: 5.6,
    status: "OPEN",
    openedAt: "11:02",
  },
];

export const mockTrades: Trade[] = [
  {
    id: "t1",
    asset: "BTC/USDT",
    side: "BUY",
    entry: 41200,
    exit: 41900,
    qty: 0.1,
    pnl: 70,
    result: "WIN",
    strategy: "Breakout",
    closedAt: "Ontem",
  },
  {
    id: "t2",
    asset: "ETH/USDT",
    side: "SELL",
    entry: 2340,
    exit: 2360,
    qty: 1,
    pnl: -20,
    result: "LOSS",
    strategy: "RSI Reversion",
    closedAt: "Ontem",
  },
  {
    id: "t3",
    asset: "AAPL",
    side: "BUY",
    entry: 220,
    exit: 224,
    qty: 5,
    pnl: 20,
    result: "WIN",
    strategy: "MA Cross",
    closedAt: "2d",
  },
  {
    id: "t4",
    asset: "SOL/USDT",
    side: "BUY",
    entry: 138,
    exit: 144,
    qty: 10,
    pnl: 60,
    result: "WIN",
    strategy: "Momentum",
    closedAt: "2d",
  },
  {
    id: "t5",
    asset: "BTC/USDT",
    side: "SELL",
    entry: 43000,
    exit: 43300,
    qty: 0.05,
    pnl: -15,
    result: "LOSS",
    strategy: "Mean Reversion",
    closedAt: "3d",
  },
];

export const mockStrategies: Strategy[] = [
  {
    id: "ma",
    name: "Média Móvel Cruzada",
    description: "Cruzamento MM20 / MM50 para captura de tendência.",
    winRate: 58,
    trades: 142,
    profitFactor: 1.62,
    weight: 0.22,
    enabled: true,
  },
  {
    id: "rsi",
    name: "RSI Reversão",
    description: "Compra em sobrevenda, venda em sobrecompra com confirmação.",
    winRate: 54,
    trades: 96,
    profitFactor: 1.38,
    weight: 0.15,
    enabled: true,
  },
  {
    id: "br",
    name: "Breakout Máx/Mín",
    description: "Rompimento da máxima/mínima de N períodos com volume.",
    winRate: 49,
    trades: 88,
    profitFactor: 1.74,
    weight: 0.2,
    enabled: true,
  },
  {
    id: "mom",
    name: "Momentum + Volume",
    description: "Aceleração de preço confirmada por volume crescente.",
    winRate: 61,
    trades: 120,
    profitFactor: 1.81,
    weight: 0.23,
    enabled: true,
  },
  {
    id: "mr",
    name: "Mean Reversion",
    description: "Retorno à média em mercados laterais de baixa volatilidade.",
    winRate: 56,
    trades: 104,
    profitFactor: 1.29,
    weight: 0.12,
    enabled: true,
  },
  {
    id: "ad",
    name: "Adaptativa (IA)",
    description: "Estratégia híbrida escolhida pela IA conforme regime de mercado.",
    winRate: 64,
    trades: 78,
    profitFactor: 1.93,
    weight: 0.08,
    enabled: true,
  },
];

export const mockAssets = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "AAPL", "TSLA", "NVDA", "EURUSD"];
export const mockTimeframes = ["1m", "5m", "15m", "1h", "4h", "1d"];
