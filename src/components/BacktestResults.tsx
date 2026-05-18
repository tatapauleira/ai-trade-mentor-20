import { TradingChart } from "./TradingChart";
import type { BacktestMetrics, ChartPoint } from "@/lib/types";

interface Props {
  metrics?: BacktestMetrics | null;
  equityCurve?: ChartPoint[];
  loading?: boolean;
}

const emptyStats = [
  { l: "Lucro/Prejuízo", v: "—" },
  { l: "Win rate", v: "—" },
  { l: "Drawdown", v: "—" },
  { l: "Total trades", v: "—" },
  { l: "Retorno", v: "—" },
  { l: "Equity final", v: "—" },
  { l: "Profit factor", v: "—" },
  { l: "Vitórias", v: "—" },
];

export function BacktestResults({ metrics, equityCurve = [], loading }: Props) {
  const stats = metrics
    ? [
        {
          l: "Retorno",
          v: `${metrics.total_return_percent >= 0 ? "+" : ""}${metrics.total_return_percent}%`,
          tone: metrics.total_return_percent >= 0 ? "text-bull" : "text-bear",
        },
        { l: "Win rate", v: `${metrics.win_rate}%` },
        { l: "Total trades", v: String(metrics.total_trades) },
        { l: "Vitórias", v: String(metrics.wins), tone: "text-bull" },
        { l: "Derrotas", v: String(metrics.losses), tone: "text-bear" },
        { l: "Equity final", v: `$ ${metrics.final_equity.toLocaleString()}` },
        { l: "Profit factor", v: metrics.profit_factor.toFixed(2) },
        { l: "Sharpe", v: "—" },
      ]
    : emptyStats;

  return (
    <div className="space-y-4">
      {loading && (
        <p className="text-sm text-muted-foreground">Executando backtest no Supabase…</p>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.l} className="rounded-lg border border-border bg-card p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
            <div className={`text-lg font-mono font-semibold ${"tone" in s ? s.tone : ""}`}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Curva de capital</h3>
          <span className="text-xs text-muted-foreground">
            {equityCurve.length ? `${equityCurve.length} pontos` : "Aguardando backtest"}
          </span>
        </div>
        <TradingChart
          data={equityCurve.length ? equityCurve : [{ day: "D0", equity: 10000 }]}
          dataKey="equity"
          xKey="day"
          tone="bull"
          height={260}
        />
      </div>
    </div>
  );
}
