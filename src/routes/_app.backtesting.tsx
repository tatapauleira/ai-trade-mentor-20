import { createFileRoute } from "@tanstack/react-router";
import { BacktestResults } from "@/components/BacktestResults";
import { mockAssets, mockStrategies, mockTimeframes } from "@/lib/mock-data";
import { Play } from "lucide-react";

export const Route = createFileRoute("/_app/backtesting")({
  component: BacktestingPage,
  head: () => ({ meta: [{ title: "Backtesting — AutoTrade AI" }] }),
});

function BacktestingPage() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Backtesting</h1>
        <p className="text-sm text-muted-foreground">Teste estratégias contra dados históricos antes de operar.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Field label="Ativo">
          <select className="input">{mockAssets.map(a => <option key={a}>{a}</option>)}</select>
        </Field>
        <Field label="Timeframe">
          <select className="input">{mockTimeframes.map(t => <option key={t}>{t}</option>)}</select>
        </Field>
        <Field label="Estratégia">
          <select className="input">{mockStrategies.map(s => <option key={s.id}>{s.name}</option>)}</select>
        </Field>
        <Field label="Período (dias)"><input className="input font-mono" defaultValue="60" /></Field>
        <Field label="Capital inicial"><input className="input font-mono" defaultValue="10000" /></Field>
        <Field label="Risco / op (%)"><input className="input font-mono" defaultValue="1.0" /></Field>

        <div className="md:col-span-3 lg:col-span-6 flex justify-end">
          <button className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 inline-flex items-center gap-2">
            <Play className="size-4" /> Rodar backtest
          </button>
        </div>
      </div>

      <BacktestResults />

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3">Comparação entre estratégias</h3>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>{["Estratégia","Trades","Win rate","PF","Drawdown","Retorno"].map(h => (
                <th key={h} className="text-left font-medium py-2">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockStrategies.map((s,i) => (
                <tr key={s.id}>
                  <td className="py-2">{s.name}</td>
                  <td className="py-2 font-mono">{s.trades}</td>
                  <td className={`py-2 font-mono ${s.winRate >= 55 ? "text-bull" : ""}`}>{s.winRate}%</td>
                  <td className="py-2 font-mono">{s.profitFactor.toFixed(2)}</td>
                  <td className="py-2 font-mono text-bear">-{(4 + i * 1.1).toFixed(1)}%</td>
                  <td className="py-2 font-mono text-bull">+{(8 + i * 2.3).toFixed(1)}%</td>
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
