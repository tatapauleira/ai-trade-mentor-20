import { createFileRoute } from "@tanstack/react-router";
import { PaperOrderTable } from "@/components/PaperOrderTable";
import { WarningBanner } from "@/components/WarningBanner";
import { MetricCard } from "@/components/MetricCard";
import { Activity, DollarSign, Target } from "lucide-react";
import { useDashboardStats, usePaperOrders, useRiskSettings } from "@/hooks/use-trading-data";

export const Route = createFileRoute("/_app/paper-trading")({
  component: PaperTradingPage,
  head: () => ({ meta: [{ title: "Paper Trading — AutoTrade AI" }] }),
});

function PaperTradingPage() {
  const { data: orders = [] } = usePaperOrders();
  const risk = useRiskSettings();
  const stats = useDashboardStats();
  const openPnl = orders.reduce((s, o) => s + o.pnl, 0);
  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "USD" });

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Paper Trading</h1>
        <p className="text-sm text-muted-foreground">Ordens simuladas via Supabase · sem capital real.</p>
      </div>
      <WarningBanner />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Saldo simulado" value={fmt(risk.data?.paperBalance ?? stats.balance)} icon={DollarSign} tone="primary" />
        <MetricCard label="P&L flutuante" value={fmt(openPnl)} icon={Target} tone={openPnl >= 0 ? "bull" : "bear"} />
        <MetricCard label="Ordens abertas" value={String(orders.length)} icon={Activity} />
        <MetricCard label="Risco/op." value={`${risk.data?.maxRiskPerTrade ?? 1}%`} icon={Activity} />
      </div>
      <PaperOrderTable />
    </>
  );
}
