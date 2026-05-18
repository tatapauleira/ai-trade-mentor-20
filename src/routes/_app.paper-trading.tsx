import { createFileRoute } from "@tanstack/react-router";
import { PaperOrderTable } from "@/components/PaperOrderTable";
import { WarningBanner } from "@/components/WarningBanner";
import { MetricCard } from "@/components/MetricCard";
import { Activity, DollarSign, Target } from "lucide-react";

export const Route = createFileRoute("/_app/paper-trading")({
  component: PaperTradingPage,
  head: () => ({ meta: [{ title: "Paper Trading — AutoTrade AI" }] }),
});

function PaperTradingPage() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Paper Trading</h1>
        <p className="text-sm text-muted-foreground">Operações simuladas em tempo real. Nenhum capital real é usado.</p>
      </div>

      <WarningBanner />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Saldo simulado"    value="$ 12.480,55" icon={DollarSign} tone="primary" />
        <MetricCard label="Equity em ordens"  value="$ 1.842,30"  icon={Activity}                  />
        <MetricCard label="P&L flutuante"     value="+$ 125,60"   icon={Target}     tone="bull"    />
        <MetricCard label="Ordens abertas"    value="3"           icon={Activity}                  />
      </div>

      <PaperOrderTable />
    </>
  );
}
