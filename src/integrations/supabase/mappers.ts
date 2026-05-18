import type {
  AISignal,
  AISignalApiResponse,
  ChartPoint,
  PaperOrder,
  RiskSettings,
  Strategy,
  Trade,
} from "@/lib/types";

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins} min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "ontem" : `${days}d`;
}

export function formatSymbol(symbol: string): string {
  if (symbol.includes("/")) return symbol;
  if (symbol.endsWith("USDT")) {
    return `${symbol.slice(0, -4)}/USDT`;
  }
  return symbol;
}

export function toDbSymbol(display: string): string {
  return display.replace("/", "").toUpperCase();
}

function regimeToTrend(regime: string): AISignal["trend"] {
  if (regime.includes("up")) return "uptrend";
  if (regime.includes("down")) return "downtrend";
  return "sideways";
}

function regimeToVolatility(regime: string): AISignal["volatility"] {
  if (regime.includes("high_volatility")) return "high";
  if (regime.includes("low_volatility")) return "low";
  return "medium";
}

export function mapApiSignalToUI(row: AISignalApiResponse, id?: string): AISignal {
  return {
    id: id ?? row.signal_id ?? crypto.randomUUID(),
    asset: formatSymbol(row.asset),
    kind: row.signal,
    confidence: row.confidence,
    entry: row.entry,
    stop: row.stop_loss,
    target: row.take_profit,
    rationale: row.reason,
    trend: regimeToTrend(row.market_regime),
    volatility: regimeToVolatility(row.market_regime),
    strategy: row.strategy,
    createdAt: "agora",
    blocked: row.blocked,
    blockReason: row.block_reason,
    signalId: row.signal_id,
  };
}

export function mapDbSignal(row: Record<string, unknown>): AISignal {
  const regime = String(row.market_regime ?? "sideways");
  return {
    id: String(row.id),
    asset: formatSymbol(String((row.assets as { symbol?: string })?.symbol ?? row.asset ?? "")),
    kind: row.signal as AISignal["kind"],
    confidence: Number(row.confidence),
    entry: Number(row.entry),
    stop: Number(row.stop_loss),
    target: Number(row.take_profit),
    rationale: String(row.reason),
    trend: regimeToTrend(regime),
    volatility: regimeToVolatility(regime),
    strategy: String(row.strategy),
    createdAt: formatRelativeTime(String(row.created_at)),
    blocked: Boolean(row.blocked),
    blockReason: row.block_reason ? String(row.block_reason) : undefined,
    signalId: String(row.id),
  };
}

export function mapDbPaperOrder(row: Record<string, unknown>): PaperOrder {
  const asset = row.assets as { symbol?: string } | null;
  return {
    id: String(row.id),
    asset: formatSymbol(asset?.symbol ?? ""),
    side: row.side as PaperOrder["side"],
    qty: Number(row.qty),
    entry: Number(row.entry_price),
    current: Number(row.current_price),
    stop: Number(row.stop_loss),
    target: Number(row.take_profit),
    pnl: Number(row.pnl),
    status: row.status as PaperOrder["status"],
    openedAt: new Date(String(row.opened_at)).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

export function mapDbTrade(row: Record<string, unknown>): Trade {
  const asset = row.assets as { symbol?: string } | null;
  return {
    id: String(row.id),
    asset: formatSymbol(asset?.symbol ?? ""),
    side: row.side as Trade["side"],
    entry: Number(row.entry),
    exit: Number(row.exit),
    qty: Number(row.qty),
    pnl: Number(row.pnl),
    result: row.result as Trade["result"],
    strategy: String(row.strategy ?? ""),
    closedAt: formatRelativeTime(String(row.closed_at)),
  };
}

export function mapDbStrategy(row: Record<string, unknown>): Strategy {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ""),
    winRate: Number(row.win_rate ?? 0),
    trades: Number(row.total_trades ?? 0),
    profitFactor: Number(row.profit_factor ?? 0),
    weight: Number(row.weight ?? 0),
    enabled: Boolean(row.enabled),
  };
}

export function mapDbRisk(row: Record<string, unknown>): RiskSettings {
  return {
    maxRiskPerTrade: Number(row.max_risk_per_trade_percent),
    maxDailyLoss: Number(row.max_daily_loss_percent),
    maxDrawdown: Number(row.max_drawdown_percent),
    maxOpenPositions: Number(row.max_open_positions),
    paperBalance: Number(row.paper_balance),
  };
}

export function mapCandlesToChart(
  rows: Array<Record<string, unknown>>,
): ChartPoint[] {
  return rows.map((c, i) => ({
    t: i,
    time: new Date(String(c.candle_time)).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    open: Number(c.open),
    close: Number(c.close),
    high: Number(c.high),
    low: Number(c.low),
    price: Number(c.close),
    volume: Number(c.volume),
  }));
}

export function mapEquityFromTrades(
  trades: Trade[],
  initialBalance: number,
): ChartPoint[] {
  let equity = initialBalance;
  const points: ChartPoint[] = [{ day: "D0", equity: initialBalance }];
  trades
    .slice()
    .reverse()
    .forEach((t, i) => {
      equity += t.pnl;
      points.push({ day: `D${i + 1}`, equity: Math.round(equity) });
    });
  if (points.length < 10) {
    return Array.from({ length: 30 }, (_, i) => ({
      day: `D${i}`,
      equity: Math.round(initialBalance + i * 40 + Math.sin(i / 3) * 200),
    }));
  }
  return points;
}
