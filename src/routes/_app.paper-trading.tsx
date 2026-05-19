import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Activity, DollarSign, Target, Brain, Play, Pause } from "lucide-react";
import { PaperOrderTable } from "@/components/PaperOrderTable";
import { WarningBanner } from "@/components/WarningBanner";
import { MetricCard } from "@/components/MetricCard";
import { useDashboardStats, usePaperOrders, useRiskSettings } from "@/hooks/use-trading-data";
import { useLiveAutoTrader } from "@/hooks/use-live-autotrader";
import { loadMemory } from "@/lib/ai-live-engine";

export const Route = createFileRoute("/_app/paper-trading")({
  component: PaperTradingPage,
  head: () => ({ meta: [{ title: "Paper Trading — AutoTrade AI" }] }),
});

const TRADING_UNIVERSE = ["BTC/USDT", "ETH/USDT", "SOL/USDT"];

function PaperTradingPage() {
  const { data: orders = [] } = usePaperOrders();
  const risk = useRiskSettings();
  const stats = useDashboardStats();
  const openPnl = orders.reduce((s, o) => s + o.pnl, 0);
  const fmt = (n: number) => `$ ${n.toFixed(2)}`;

  const [live, setLive] = useState(false);
  const [minConf, setMinConf] = useState(55);
  const { status, lastSignal } = useLiveAutoTrader(live, {
    assets: TRADING_UNIVERSE,
    intervalMs: 45_000,
    priceMs: 12_000,
    minConfidence: minConf,
    maxOpen: risk.data?.maxOpenPositions ?? 5,
  });

  const learning = useMemo(() => {
    const mem = loadMemory();
    const entries = Object.entries(mem);
    const totalWins = entries.reduce((a, [, v]) => a + v.wins, 0);
    const totalLoss = entries.reduce((a, [, v]) => a + v.losses, 0);
    const n = totalWins + totalLoss;
    return {
      samples: n,
      winRate: n > 0 ? ((totalWins / n) * 100).toFixed(1) : "—",
      pairs: entries.length,
    };
  }, [orders.length, live]);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Paper Trading</h1>
        <p className="text-sm text-muted-foreground">
          Simulação com dados reais de mercado · a IA aprende com cada operação.
        </p>
      </div>
      <WarningBanner />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Saldo simulado" value={fmt(risk.data?.paperBalance ?? stats.balance)} icon={DollarSign} tone="primary" />
        <MetricCard label="P&L flutuante" value={fmt(openPnl)} icon={Target} tone={openPnl >= 0 ? "bull" : "bear"} />
        <MetricCard label="Ordens abertas" value={String(orders.length)} icon={Activity} />
        <MetricCard label="Risco/op." value={`${risk.data?.maxRiskPerTrade ?? 1}%`} icon={Activity} />
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-md bg-primary/15 text-primary grid place-items-center">
              <Brain className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">IA Live Auto-Trader</h3>
              <p className="text-xs text-muted-foreground max-w-xl">
                A IA observa <span className="text-foreground">{TRADING_UNIVERSE.join(", ")}</span> em
                tempo real (Binance), gera sinais a cada 45s e abre/fecha ordens simuladas
                automaticamente. Cada vitória ou derrota alimenta a memória de aprendizado.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLive((v) => !v)}
            className={`h-10 px-4 rounded-md text-sm font-medium inline-flex items-center gap-2 ${
              live
                ? "bg-bear text-background hover:opacity-90"
                : "bg-primary text-primary-foreground hover:opacity-90"
            }`}
          >
            {live ? <Pause className="size-4" /> : <Play className="size-4" />}
            {live ? "Pausar IA" : "Ativar IA ao vivo"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-md border border-border bg-surface px-3 py-2">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Status</div>
            <div className="font-medium mt-0.5">
              <span className={`inline-block size-2 rounded-full mr-2 ${live ? "bg-bull animate-pulse" : "bg-muted-foreground/50"}`} />
              {status}
            </div>
          </div>
          <div className="rounded-md border border-border bg-surface px-3 py-2">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Memória de aprendizado</div>
            <div className="font-medium mt-0.5">
              {learning.samples} trades · {learning.pairs} setups · winrate {learning.winRate}%
            </div>
          </div>
          <div className="rounded-md border border-border bg-surface px-3 py-2">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Confiança mínima</div>
            <div className="flex items-center gap-2 mt-0.5">
              <input
                type="range"
                min={40}
                max={85}
                value={minConf}
                onChange={(e) => setMinConf(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="font-mono text-xs w-10 text-right">{minConf}%</span>
            </div>
          </div>
        </div>

        {lastSignal && (
          <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
            Último sinal · <span className="text-foreground font-medium">{lastSignal.asset}</span>{" "}
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                lastSignal.kind === "BUY"
                  ? "bg-bull/15 text-bull"
                  : lastSignal.kind === "SELL"
                    ? "bg-bear/15 text-bear"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {lastSignal.kind} {lastSignal.confidence}%
            </span>{" "}
            · {lastSignal.rationale}
          </div>
        )}
      </div>

      <PaperOrderTable />
    </>
  );
}
