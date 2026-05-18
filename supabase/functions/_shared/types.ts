export type SignalKind = "BUY" | "SELL" | "WAIT";

export interface AISignalResponse {
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

export interface RiskSettings {
  max_risk_per_trade_percent: number;
  max_daily_loss_percent: number;
  max_drawdown_percent: number;
  max_open_positions: number;
  paper_balance: number;
}

export interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
}

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  candle_time: string;
}
