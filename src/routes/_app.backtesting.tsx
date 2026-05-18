import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BacktestResults } from "@/components/BacktestResults";
import { useAssets, useRunBacktest, useStrategies } from "@/hooks/use-trading-data";
import { TIMEFRAMES } from "@/lib/types";
import type { BacktestMetrics, ChartPoint } from "@/lib/types";
import { Play } from "lucide-react";

export const Route = createFileRoute("/_app/backtesting")({
  component: BacktestingPage,
  head: () => ({ meta: [{ title: "Backtesting — AutoTrade AI" }] }),
});

function BacktestingPage() {
  const { data: assets = [] } = useAssets();
  const { data: strategies = [] } = useStrategies();
  const run = useRunBacktest();

  const [asset, setAsset] = useState("BTC/USDT");
  const [timeframe, setTimeframe] = useState("1h");
  const [strategyId, setStrategyId] = useState("");
  const [days, setDays] = useState("60");
  const [capital, setCapital] = useState("10000");
  const [metrics, setMetrics] = useState<BacktestMetrics | null>(null);
  const [curve, setCurve] = useState<ChartPoint[]>([]);

  async function handleRun() {
    const res = await run.mutateAsync({
      asset,
      timeframe,
      strategyId: strategyId || undefined,
      initialCapital: Number(capital),
      days: Number(days),
    });
    setMetrics(res.metrics);
    setCurve(res.equity_curve);
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Backtesting</h1>
        <p className="text-sm text-muted-foreground">Edge Function run-backtest no Supabase.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Field label="Ativo">
          <select className="input" value={asset} onChange={(e) => setAsset(e.target.value)}>
            {assets.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </Field>
        <Field label="Timeframe">
          <select className="input" value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
            {TIMEFRAMES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Estratégia">
          <select className="input" value={strategyId} onChange={(e) => setStrategyId(e.target.value)}>
            <option value="">Todas (IA)</option>
            {strategies.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Período (dias)">
          <input className="input font-mono" value={days} onChange={(e) => setDays(e.target.value)} />
        </Field>
        <Field label="Capital inicial">
          <input className="input font-mono" value={capital} onChange={(e) => setCapital(e.target.value)} />
        </Field>
        <div className="md:col-span-3 lg:col-span-6 flex justify-end items-end">
          <button
            type="button"
            onClick={handleRun}
            disabled={run.isPending}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Play className="size-4" /> {run.isPending ? "Rodando…" : "Rodar backtest"}
          </button>
        </div>
      </div>

      {run.isError && (
        <p className="text-sm text-bear">{(run.error as Error).message}</p>
      )}

      <BacktestResults metrics={metrics} equityCurve={curve} loading={run.isPending} />

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3">Estratégias cadastradas</h3>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                {["Estratégia", "Trades", "Win rate", "PF", "Peso"].map((h) => (
                  <th key={h} className="text-left font-medium py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {strategies.map((s) => (
                <tr key={s.id}>
                  <td className="py-2">{s.name}</td>
                  <td className="py-2 font-mono">{s.trades}</td>
                  <td className="py-2 font-mono">{s.winRate}%</td>
                  <td className="py-2 font-mono">{s.profitFactor.toFixed(2)}</td>
                  <td className="py-2 font-mono">{(s.weight * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`.input{height:36px;border-radius:6px;background:var(--surface);border:1px solid var(--border);padding:0 10px;font-size:14px;outline:none;width:100%}`}</style>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
