import { createFileRoute } from "@tanstack/react-router";
import { PlayCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { SignalCard } from "@/components/SignalCard";
import { AIExplanationCard } from "@/components/AIExplanationCard";
import { TradingChart } from "@/components/TradingChart";
import { WarningBanner } from "@/components/WarningBanner";
import {
  useAssets,
  useCandles,
  useExecutePaperOrder,
  useGenerateSignal,
  useSignals,
} from "@/hooks/use-trading-data";
import { mockSignals } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/ai-trader")({
  component: AITraderPage,
  head: () => ({ meta: [{ title: "IA Trader — AutoTrade AI" }] }),
});

function AITraderPage() {
  const { data: assets = [] } = useAssets();
  const [asset, setAsset] = useState("BTC/USDT");
  const { data: signals = mockSignals } = useSignals(5);
  const { data: candles = [] } = useCandles(asset, "1h");
  const generate = useGenerateSignal();
  const executePaper = useExecutePaperOrder();

  const featured = generate.data ?? signals[0];
  const others = generate.data ? signals : signals.slice(1);

  async function handleGenerate() {
    await generate.mutateAsync({ asset });
  }

  async function handleApprove() {
    const id = featured?.signalId ?? featured?.id;
    if (!id || featured.kind === "WAIT") return;
    await executePaper.mutateAsync(id);
  }

  return (
    <>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">IA Trader</h1>
          <p className="text-sm text-muted-foreground">Sinais via Edge Function generate-ai-signal.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
            className="h-9 rounded-md bg-surface border border-border px-3 text-sm"
          >
            {assets.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generate.isPending}
            className="h-9 px-3 rounded-md border border-border hover:bg-surface-elevated text-sm inline-flex items-center gap-2"
          >
            <RefreshCw className={`size-4 ${generate.isPending ? "animate-spin" : ""}`} />
            Gerar sinal
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={executePaper.isPending || featured?.blocked || featured?.kind === "WAIT"}
            className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 inline-flex items-center gap-2 disabled:opacity-50"
          >
            <PlayCircle className="size-4" /> Aprovar em paper
          </button>
        </div>
      </div>

      <WarningBanner />
      {featured?.blocked && (
        <p className="text-sm text-bear border border-bear/30 bg-bear/10 rounded-md px-3 py-2">
          Bloqueado: {featured.blockReason}
        </p>
      )}
      {generate.isError && (
        <p className="text-sm text-bear">{(generate.error as Error).message}</p>
      )}

      {featured && (
        <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Ativo</div>
                  <div className="text-xl font-semibold">{featured.asset}</div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-semibold border border-bull/40 bg-bull/10 text-bull">
                  {featured.kind} · {featured.confidence}%
                </span>
              </div>
              <TradingChart data={candles} dataKey="price" xKey="time" tone="bull" height={260} />
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={executePaper.isPending || featured.blocked || featured.kind === "WAIT"}
                  className="h-9 flex-1 rounded-md bg-bull text-background text-sm font-medium hover:opacity-90 inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
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
            <h3 className="text-sm font-semibold">Outros sinais</h3>
            {others.slice(0, 4).map((s) => (
              <SignalCard key={s.id} signal={s} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
