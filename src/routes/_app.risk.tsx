import { createFileRoute } from "@tanstack/react-router";
import { RiskPanel } from "@/components/RiskPanel";
import { WarningBanner } from "@/components/WarningBanner";

export const Route = createFileRoute("/_app/risk")({
  component: RiskPage,
  head: () => ({ meta: [{ title: "Gestão de risco — AutoTrade AI" }] }),
});

function RiskPage() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gestão de risco</h1>
        <p className="text-sm text-muted-foreground">Toda ordem passa pelo Risk Manager antes de ser executada.</p>
      </div>

      <WarningBanner message="Nunca opere sem limite de risco definido. O Risk Manager bloqueia ordens acima do permitido." />

      <RiskPanel />
    </>
  );
}
