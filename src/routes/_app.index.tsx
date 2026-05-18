import { createFileRoute } from "@tanstack/react-router";
import { Activity, DollarSign, Percent, TrendingDown, BarChart3, Target } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { TradingChart } from "@/components/TradingChart";
import { SignalCard } from "@/components/SignalCard";
import { WarningBanner } from "@/components/WarningBanner";
import { mockEquityCurve, mockSignals } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Dashboard — AutoTrade AI" }] }),
});

function DashboardPage() {
  return (
    <>
      <WarningBanner message="AutoTrade AI está em modo simulação. Nenhuma ordem real será executada." />

      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Painel</h1>
          <p className="text-sm text-muted-foreground">Visão geral da banca simulada e da IA Trader.</p>
        </div>
        <div className="flex items-center gap-2 px-3 h-9 rounded-md border border-bull/40 bg-bull/10 text-sm">
          <span className="size-2 rounded-full bg-bull animate-pulse" />
          <span className="text-bull font-medium">IA analisando</span>
          <span className="text-muted-foreground">· 7 ativos</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Saldo simulado"   value="$ 12.480,55" icon={DollarSign} delta={2.34} tone="primary" />
        <MetricCard label="P&L diário"        value="+$ 340,80"   icon={Activity}   delta={1.21} tone="bull"    />
        <MetricCard label="Win rate"          value="58,4%"       icon={Percent}    hint="142 trades"            />
        <MetricCard label="Drawdown máx."     value="-8,2%"       icon={TrendingDown} tone="bear"  hint="30d"   />
        <MetricCard label="Profit factor"     value="1,72"        icon={BarChart3}  tone="bull"                  />
        <MetricCard label="Sharpe ratio"      value="1,38"        icon={Target}                                  />
        <MetricCard label="Operações abertas" value="3"           icon={Activity}   hint="paper trading"         />
        <MetricCard label="Risco/op."         value="1,0%"        icon={Percent}    hint="dentro do limite"      />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold">Evolução da banca</h3>
              <p className="text-xs text-muted-foreground">Últimos 60 dias · capital simulado</p>
            </div>
            <div className="flex gap-1 text-xs">
              {["7D","30D","60D","1A"].map((p,i) => (
                <button key={p} className={`px-2 h-7 rounded border ${i===2 ? "border-primary/50 text-primary bg-primary/10" : "border-border text-muted-foreground hover:bg-surface-elevated"}`}>{p}</button>
              ))}
            </div>
          </div>
          <TradingChart data={mockEquityCurve} dataKey="equity" xKey="day" tone="bull" height={320} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Sinais recentes da IA</h3>
            <span className="text-xs text-muted-foreground">tempo real</span>
          </div>
          {mockSignals.slice(0,3).map((s) => <SignalCard key={s.id} signal={s} compact />)}
        </div>
      </div>
    </>
  );
}
