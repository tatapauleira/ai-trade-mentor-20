export type SignalKind = "BUY" | "SELL" | "WAIT";

export interface AISignal {
  id: string;
  asset: string;
  kind: SignalKind;
  confidence: number;
  entry: number;
  stop: number;
  target: number;
  rationale: string;
  trend: "uptrend" | "downtrend" | "sideways";
  volatility: "low" | "medium" | "high";
  strategy: string;
  createdAt: string;
  blocked?: boolean;
  blockReason?: string;
  signalId?: string;
}

export interface PaperOrder {
  id: string;
  asset: string;
  side: "BUY" | "SELL";
  qty: number;
  entry: number;
  current: number;
  stop: number;
  target: number;
  pnl: number;
  status: "OPEN" | "CLOSED";
  openedAt: string;
}

export interface Trade {
  id: string;
  asset: string;
  side: "BUY" | "SELL";
  entry: number;
  exit: number;
  qty: number;
  pnl: number;
  result: "WIN" | "LOSS";
  strategy: string;
  closedAt: string;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  winRate: number;
  trades: number;
  profitFactor: number;
  weight: number;
  enabled: boolean;
}

export interface RiskSettings {
  maxRiskPerTrade: number;
  maxDailyLoss: number;
  maxDrawdown: number;
  maxOpenPositions: number;
  paperBalance: number;
}

export interface ChartPoint {
  day?: string;
  time?: string;
  equity?: number;
  price?: number;
  open?: number;
  close?: number;
  high?: number;
  low?: number;
  volume?: number;
}

export interface AISignalApiResponse {
  asset: string;
  signal: SignalKind;
  confidence: number;
  entry: number;
  stop_loss: number;
  take_profit: number;
  risk_percent: number;
  strategy: string;
  market_regime: string;
  reason: string;
  blocked?: boolean;
  block_reason?: string;
  signal_id?: string;
}

export interface BacktestMetrics {
  total_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  profit_factor: number;
  total_return_percent: number;
  final_equity: number;
}

export const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;
