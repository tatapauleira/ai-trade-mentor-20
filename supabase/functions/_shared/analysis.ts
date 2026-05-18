import type { Candle, SignalKind } from "./types.ts";

const STRATEGIES = [
  "Média Móvel Cruzada",
  "RSI Reversão",
  "Breakout Máx/Mín",
  "Momentum + Volume",
  "Mean Reversion",
  "Adaptativa (IA)",
] as const;

function sma(values: number[], period: number): number {
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

export function detectMarketRegime(candles: Candle[]): string {
  if (candles.length < 20) return "insufficient_data";
  const closes = candles.map((c) => c.close);
  const recent = closes.slice(-20);
  const older = closes.slice(-40, -20);
  if (older.length < 10) return "sideways";

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  const change = ((recentAvg - olderAvg) / olderAvg) * 100;

  const volatility =
    recent.reduce((s, c, i) => {
      if (i === 0) return 0;
      return s + Math.abs(c - recent[i - 1]) / recent[i - 1];
    }, 0) / (recent.length - 1);

  if (Math.abs(change) < 0.5 && volatility < 0.005) return "low_volatility_sideways";
  if (change > 1.5) return "uptrend";
  if (change < -1.5) return "downtrend";
  if (volatility > 0.015) return "high_volatility";
  return "sideways";
}

export interface GeneratedSignal {
  signal: SignalKind;
  confidence: number;
  entry: number;
  stop_loss: number;
  take_profit: number;
  risk_percent: number;
  strategy: string;
  market_regime: string;
  reason: string;
}

export function generateSignalFromCandles(
  candles: Candle[],
  defaultRiskPercent = 1.0,
): GeneratedSignal {
  const closes = candles.map((c) => c.close);
  const last = closes[closes.length - 1];
  const regime = detectMarketRegime(candles);
  const rsiVal = rsi(closes);
  const ma20 = sma(closes, 20);
  const ma50 = sma(closes, Math.min(50, closes.length));
  const high20 = Math.max(...candles.slice(-20).map((c) => c.high));
  const low20 = Math.min(...candles.slice(-20).map((c) => c.low));

  let signal: SignalKind = "WAIT";
  let confidence = 45;
  let strategy = STRATEGIES[5];
  let reason = "Mercado sem setup claro. Aguardar confirmação.";

  if (regime === "uptrend" && last > ma20 && ma20 > ma50 && rsiVal > 50 && rsiVal < 72) {
    signal = "BUY";
    confidence = Math.min(85, 60 + Math.round((rsiVal - 50) / 2));
    strategy = STRATEGIES[0];
    reason =
      "Tendência de alta com preço acima da MM20/MM50 e RSI em zona construtiva.";
  } else if (regime === "downtrend" && last < ma20 && ma20 < ma50 && rsiVal < 50 && rsiVal > 28) {
    signal = "SELL";
    confidence = Math.min(82, 58 + Math.round((50 - rsiVal) / 2));
    strategy = STRATEGIES[1];
    reason =
      "Tendência de baixa com preço abaixo das médias e RSI indicando fraqueza.";
  } else if (last >= high20 * 0.998 && regime !== "low_volatility_sideways") {
    signal = "BUY";
    confidence = 72;
    strategy = STRATEGIES[2];
    reason = "Rompimento da máxima de 20 períodos com volume consistente.";
  } else if (rsiVal <= 30 && regime !== "downtrend") {
    signal = "BUY";
    confidence = 68;
    strategy = STRATEGIES[4];
    reason = "RSI em sobrevenda com expectativa de retorno à média.";
  } else if (rsiVal >= 70 && regime !== "uptrend") {
    signal = "SELL";
    confidence = 66;
    strategy = STRATEGIES[4];
    reason = "RSI em sobrecompra com expectativa de correção.";
  } else if (last <= low20 * 1.002 && regime === "high_volatility") {
    signal = "SELL";
    confidence = 70;
    strategy = STRATEGIES[2];
    reason = "Rompimento da mínima de 20 períodos em ambiente volátil.";
  }

  const atr =
    candles.slice(-14).reduce((s, c) => s + (c.high - c.low), 0) / 14 || last * 0.01;

  let stop_loss: number;
  let take_profit: number;

  if (signal === "BUY") {
    stop_loss = +(last - atr * 1.5).toFixed(8);
    take_profit = +(last + atr * 2.5).toFixed(8);
  } else if (signal === "SELL") {
    stop_loss = +(last + atr * 1.5).toFixed(8);
    take_profit = +(last - atr * 2.5).toFixed(8);
  } else {
    stop_loss = +(last - atr).toFixed(8);
    take_profit = +(last + atr).toFixed(8);
  }

  const riskAmount = Math.abs(last - stop_loss);
  const risk_percent = signal === "WAIT"
    ? 0
    : +((riskAmount / last) * 100).toFixed(4) || defaultRiskPercent;

  return {
    signal,
    confidence,
    entry: +last.toFixed(8),
    stop_loss,
    take_profit,
    risk_percent: risk_percent || defaultRiskPercent,
    strategy,
    market_regime: regime,
    reason,
  };
}
