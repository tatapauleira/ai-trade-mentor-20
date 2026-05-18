import { createFileRoute } from "@tanstack/react-router";
import { Activity, DollarSign, Percent, TrendingDown, BarChart3, Target } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { TradingChart } from "@/components/TradingChart";
import { SignalCard } from "@/components/SignalCard";
import { WarningBanner } from "@/components/WarningBanner";
import { useAuth } from "@/contexts/auth-context";
import { useDashboardStats, useEquityCurve, useSignals } from "@/hooks/use-trading-data";

export const Route = createFileRoute("/_app/")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Dashboard — AutoTrade AI" }] }),
});

function DashboardPage() {
  const { mode } = useAuth();
  const stats = useDashboardStats();
  const { data: equity = [] } = useEquityCurve();
  const { data: signals = [] } = useSignals(3);

  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <>
      <WarningBanner message="AutoTrade AI está em modo simulação. Nenhuma ordem real será executada." />

      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Painel</h1>
          <p className="text-sm text-muted-foreground">
            Visão geral da banca simulada · {mode === "live" ? "Supabase conectado" : "modo mock"}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 h-9 rounded-md border border-bull/40 bg-bull/10 text-sm">
          <span className="size-2 rounded-full bg-bull animate-pulse" />
          <span className="text-bull font-medium">IA analisando</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Saldo simulado" value={fmt(stats.balance)} icon={DollarSign} tone="primary" />
        <MetricCard
          label="P&L flutuante"
          value={fmt(stats.dailyPnl)}
          icon={Activity}
          tone={stats.dailyPnl >= 0 ? "bull" : "bear"}
        />
        <MetricCard label="Win rate" value={`${stats.winRate}%`} icon={Percent} />
        <MetricCard label="Drawdown máx." value="—" icon={TrendingDown} tone="bear" hint="30d" />
        <MetricCard label="Profit factor" value="—" icon={BarChart3} tone="bull" />
        <MetricCard label="Sharpe ratio" value="—" icon={Target} />
        <MetricCard label="Operações abertas" value={String(stats.openOrders)} icon={Activity} hint="paper" />
        <MetricCard label="Risco/op." value={`${stats.maxRisk}%`} icon={Percent} hint="limite" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">Evolução da banca</h3>
          <TradingChart data={equity} dataKey="equity" xKey="day" tone="bull" height={320} />
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Sinais recentes da IA</h3>
          {signals.map((s) => (
            <SignalCard key={s.id} signal={s} compact />
          ))}
        </div>
      </div>
    </>
  );
}

