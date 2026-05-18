import { createFileRoute } from "@tanstack/react-router";
import { Pause, PlayCircle, CheckCircle2 } from "lucide-react";
import { SignalCard } from "@/components/SignalCard";
import { AIExplanationCard } from "@/components/AIExplanationCard";
import { TradingChart } from "@/components/TradingChart";
import { WarningBanner } from "@/components/WarningBanner";
import { mockPriceCandles, mockSignals } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/ai-trader")({
  component: AITraderPage,
  head: () => ({ meta: [{ title: "IA Trader — AutoTrade AI" }] }),
});

function AITraderPage() {
  const featured = mockSignals[0];

  return (
    <>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">IA Trader</h1>
          <p className="text-sm text-muted-foreground">Análise contínua · sinais probabilísticos com gestão de risco.</p>
        </div>
        <div className="flex gap-2">
          <button className="h-9 px-3 rounded-md border border-border hover:bg-surface-elevated text-sm inline-flex items-center gap-2">
            <Pause className="size-4" /> Pausar IA
          </button>
          <button className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 inline-flex items-center gap-2">
            <PlayCircle className="size-4" /> Aprovar em paper
          </button>
        </div>
      </div>

      <WarningBanner />

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Ativo analisado</div>
                <div className="text-xl font-semibold">{featured.asset}</div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-semibold border border-bull/40 bg-bull/10 text-bull glow-bull">
                {featured.kind} · {featured.confidence}%
              </span>
            </div>
            <TradingChart data={mockPriceCandles} dataKey="price" xKey="time" tone="bull" height={260} />
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
              {[
                ["Entrada", featured.entry, "text-foreground"],
                ["Stop loss", featured.stop, "text-bear"],
                ["Take profit", featured.target, "text-bull"],
              ].map(([l,v,c]) => (
                <div key={l as string} className="rounded-md bg-surface border border-border px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</div>
                  <div className={`font-mono text-sm ${c}`}>{(v as number).toLocaleString()}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button className="h-9 flex-1 rounded-md border border-border text-sm hover:bg-surface-elevated">
                Simular operação
              </button>
              <button className="h-9 flex-1 rounded-md bg-bull text-background text-sm font-medium hover:opacity-90 inline-flex items-center justify-center gap-2">
                <CheckCircle2 className="size-4" /> Aprovar em paper trading
              </button>
            </div>
          </div>

          <AIExplanationCard
            asset={featured.asset}
            trend={featured.trend}
            volatility={featured.volatility}
            rationale={featured.rationale}
          />
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Outros sinais ativos</h3>
          {mockSignals.slice(1).map((s) => <SignalCard key={s.id} signal={s} />)}
        </div>
      </div>
    </>
  );
}
