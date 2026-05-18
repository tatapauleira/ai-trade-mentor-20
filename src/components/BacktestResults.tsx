import { TradingChart } from "./TradingChart";
import { mockEquityCurve } from "@/lib/mock-data";

const stats = [
  { l: "Lucro/Prejuízo", v: "+$ 2.340,80", tone: "text-bull" },
  { l: "Win rate", v: "58,4%" },
  { l: "Drawdown", v: "-8,2%", tone: "text-bear" },
  { l: "Total trades", v: "142" },
  { l: "Melhor trade", v: "+$ 412,00", tone: "text-bull" },
  { l: "Pior trade", v: "-$ 184,00", tone: "text-bear" },
  { l: "Profit factor", v: "1,72" },
  { l: "Sharpe", v: "1,38" },
];

export function BacktestResults() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.l} className="rounded-lg border border-border bg-card p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
            <div className={`text-lg font-mono font-semibold ${s.tone ?? ""}`}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Curva de capital</h3>
          <span className="text-xs text-muted-foreground">60 dias · estratégia Momentum + Volume</span>
        </div>
        <TradingChart data={mockEquityCurve} dataKey="equity" xKey="day" tone="bull" height={260} />
      </div>
    </div>
  );
}
