import { createFileRoute } from "@tanstack/react-router";
import { StrategySelector } from "@/components/StrategySelector";

export const Route = createFileRoute("/_app/strategies")({
  component: StrategiesPage,
  head: () => ({ meta: [{ title: "Estratégias — AutoTrade AI" }] }),
});

function StrategiesPage() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Estratégias</h1>
        <p className="text-sm text-muted-foreground">Pesos reajustados pela IA com base em win rate, drawdown e Sharpe.</p>
      </div>
      <StrategySelector />
    </>
  );
}
