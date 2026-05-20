import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowUpRight, Target, Trophy, TrendingDown, Clock,
} from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { WarningBanner } from "@/components/WarningBanner";
import {
  useDashboardStats, usePaperOrders, useTrades,
} from "@/hooks/use-trading-data";
import { fmtNum, fmtUSD } from "@/lib/format";
import type { Trade } from "@/lib/types";

export const Route = createFileRoute("/_app/operations")({
  component: OperationsPage,
  head: () => ({
    meta: [
      { title: "Operações — AutoTrade AI" },
      { name: "description", content: "Detalhamento completo de compras, vendas, duração, resultado e win-rate de cada operação." },
    ],
  }),
});

type Filter = "all" | "open" | "closed" | "win" | "loss";

function durationLabel(openTs?: number, closeTs?: number): string {
  if (!openTs) return "—";
  const end = closeTs ?? Date.now();
  const s = Math.max(0, Math.floor((end - openTs) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function pctOf(entry: number, exit: number, side: "BUY" | "SELL") {
  if (!entry) return 0;
  const dir = side === "BUY" ? 1 : -1;
  return +(((exit - entry) / entry) * 100 * dir).toFixed(2);
}

function OperationsPage() {
  const { data: orders = [] } = usePaperOrders();
  const { data: trades = [] } = useTrades(100);
  const stats = useDashboardStats();
  const [filter, setFilter] = useState<Filter>("all");

  const wins = trades.filter((t) => t.result === "WIN");
  const losses = trades.filter((t) => t.result === "LOSS");
  const totalClosed = trades.length;
  const winRatePct = totalClosed > 0 ? (wins.length / totalClosed) * 100 : 0;
  const lossRatePct = totalClosed > 0 ? (losses.length / totalClosed) * 100 : 0;
  const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;
  const profitFactor =
    losses.length && Math.abs(avgLoss) > 0
      ? (wins.reduce((s, t) => s + t.pnl, 0)) / Math.abs(losses.reduce((s, t) => s + t.pnl, 0))
      : wins.length > 0
        ? Infinity
        : 0;

  type Row =
    | { kind: "open"; id: string; asset: string; side: "BUY" | "SELL"; qty: number; entry: number; exit: number; pnl: number; pnlPct: number; status: "ABERTA"; openedAt: string; closedAt: string; duration: string; strategy: string; result: "—" }
    | { kind: "closed"; id: string; asset: string; side: "BUY" | "SELL"; qty: number; entry: number; exit: number; pnl: number; pnlPct: number; status: "FECHADA"; openedAt: string; closedAt: string; duration: string; strategy: string; result: "WIN" | "LOSS" };

  const rows = useMemo<Row[]>(() => {
    const openRows: Row[] = orders.map((o) => ({
      kind: "open",
      id: o.id,
      asset: o.asset,
      side: o.side,
      qty: o.qty,
      entry: o.entry,
      exit: o.current,
      pnl: o.pnl,
      pnlPct: pctOf(o.entry, o.current, o.side),
      status: "ABERTA",
      openedAt: o.openedAt,
      closedAt: "—",
      duration: durationLabel(o.openedTs),
      strategy: o.strategy ?? "AI Live",
      result: "—",
    }));
    const closedRows: Row[] = (trades as Trade[]).map((t) => ({
      kind: "closed",
      id: t.id,
      asset: t.asset,
      side: t.side,
      qty: t.qty,
      entry: t.entry,
      exit: t.exit,
      pnl: t.pnl,
      pnlPct: t.pnlPct ?? pctOf(t.entry, t.exit, t.side),
      status: "FECHADA",
      openedAt: t.openedAt ?? "—",
      closedAt: t.closedAt,
      duration: durationLabel(t.openedTs, t.closedTs),
      strategy: t.strategy,
      result: t.result,
    }));
    const all = [...openRows, ...closedRows];
    if (filter === "open") return all.filter((r) => r.kind === "open");
    if (filter === "closed") return all.filter((r) => r.kind === "closed");
    if (filter === "win") return all.filter((r) => r.kind === "closed" && r.result === "WIN");
    if (filter === "loss") return all.filter((r) => r.kind === "closed" && r.result === "LOSS");
    return all;
  }, [orders, trades, filter]);

  const verdict =
    winRatePct >= 60
      ? { txt: "Performance saudável · IA ganhando mais que perdendo", tone: "bull" as const }
      : winRatePct >= 45
        ? { txt: "Performance neutra · monitorando setups", tone: "primary" as const }
        : { txt: "Atenção · IA está perdendo mais do que ganhando", tone: "bear" as const };

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Operações</h1>
        <p className="text-sm text-muted-foreground">
          Histórico detalhado de compras e vendas: início, fim, duração, lucro/perda, % e taxa de acerto.
        </p>
      </div>

      <WarningBanner />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Saldo (realizado)" value={fmtUSD(stats.balance)} icon={Target} tone="primary" />
        <MetricCard
          label="Equity (com aberto)"
          value={fmtUSD(stats.equity)}
          icon={Activity}
          tone={stats.equity >= stats.balance ? "bull" : "bear"}
        />
        <MetricCard
          label="Win rate"
          value={`${winRatePct.toFixed(1)}%`}
          icon={Trophy}
          tone={winRatePct >= 50 ? "bull" : "bear"}
        />
        <MetricCard
          label="Loss rate"
          value={`${lossRatePct.toFixed(1)}%`}
          icon={TrendingDown}
          tone={lossRatePct > winRatePct ? "bear" : "primary"}
        />
      </div>

      <div className={`rounded-xl border px-5 py-4 flex items-center gap-3 text-sm ${
        verdict.tone === "bull" ? "border-bull/40 bg-bull/10 text-bull"
        : verdict.tone === "bear" ? "border-bear/40 bg-bear/10 text-bear"
        : "border-primary/40 bg-primary/10 text-primary"
      }`}>
        <Trophy className="size-4" />
        <span className="font-medium">{verdict.txt}</span>
        <span className="text-muted-foreground ml-auto text-xs">
          {wins.length} vitórias · {losses.length} perdas · profit factor{" "}
          {Number.isFinite(profitFactor) ? profitFactor.toFixed(2) : "∞"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
        <div className="rounded-md border border-border bg-surface px-3 py-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Trades fechados</div>
          <div className="font-mono mt-0.5">{totalClosed}</div>
        </div>
        <div className="rounded-md border border-border bg-surface px-3 py-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Ganho médio</div>
          <div className="font-mono mt-0.5 text-bull">+{fmtNum(avgWin)}</div>
        </div>
        <div className="rounded-md border border-border bg-surface px-3 py-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Perda média</div>
          <div className="font-mono mt-0.5 text-bear">{fmtNum(avgLoss)}</div>
        </div>
        <div className="rounded-md border border-border bg-surface px-3 py-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Ordens abertas</div>
          <div className="font-mono mt-0.5">{orders.length}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ["all", "Todas"],
          ["open", "Abertas"],
          ["closed", "Fechadas"],
          ["win", "Vitórias"],
          ["loss", "Perdas"],
        ] as [Filter, string][]).map(([k, lbl]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`px-3 h-8 rounded-md text-xs font-medium border transition-colors ${
              filter === k
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-surface"
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-surface">
              <tr>
                {[
                  "Ativo", "Lado", "Qtd", "Entrada", "Saída", "PnL", "%",
                  "Status", "Início", "Fim", "Duração", "Estratégia",
                ].map((h) => (
                  <th key={h} className="text-left font-medium px-3 py-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-muted-foreground text-xs">
                    Nenhuma operação para este filtro.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={`${r.kind}-${r.id}`} className="hover:bg-surface/60">
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap">{r.asset}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                      r.side === "BUY"
                        ? "bg-bull/15 text-bull border border-bull/30"
                        : "bg-bear/15 text-bear border border-bear/30"
                    }`}>
                      {r.side === "BUY" ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                      {r.side}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono">{r.qty}</td>
                  <td className="px-3 py-2.5 font-mono">{fmtNum(r.entry)}</td>
                  <td className="px-3 py-2.5 font-mono">{fmtNum(r.exit)}</td>
                  <td className={`px-3 py-2.5 font-mono ${r.pnl >= 0 ? "text-bull" : "text-bear"}`}>
                    {r.pnl >= 0 ? "+" : ""}{r.pnl.toFixed(2)}
                  </td>
                  <td className={`px-3 py-2.5 font-mono ${r.pnlPct >= 0 ? "text-bull" : "text-bear"}`}>
                    {r.pnlPct >= 0 ? "+" : ""}{r.pnlPct.toFixed(2)}%
                  </td>
                  <td className="px-3 py-2.5">
                    {r.kind === "open" ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-primary/15 text-primary border border-primary/30">
                        ABERTA
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        r.result === "WIN"
                          ? "bg-bull/15 text-bull border border-bull/30"
                          : "bg-bear/15 text-bear border border-bear/30"
                      }`}>
                        {r.result}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.openedAt}</td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.closedAt}</td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" />{r.duration}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.strategy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
