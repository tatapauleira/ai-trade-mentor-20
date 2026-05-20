import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Activity, ArrowDownRight, ArrowUpRight, Target, Trophy, TrendingDown, Clock,
  Radio, Zap, X, RotateCw, Power, Wallet, ShieldAlert,
} from "lucide-react";
import {
  Area, ComposedChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  ReferenceDot, ReferenceLine,
} from "recharts";
import { MetricCard } from "@/components/MetricCard";
import { WarningBanner } from "@/components/WarningBanner";
import {
  useCandles, useDashboardStats, usePaperOrders, useRiskSettings, useTrades,
} from "@/hooks/use-trading-data";
import { updateOrderWithPrice, recordOutcome } from "@/lib/ai-live-engine";
import { fetchLiveCandles } from "@/lib/market-live";
import { fmtNum, fmtUSD } from "@/lib/format";
import type { PaperOrder, Trade } from "@/lib/types";

export const Route = createFileRoute("/_app/operations")({
  component: OperationsPage,
  head: () => ({
    meta: [
      { title: "Operações — AutoTrade AI" },
      { name: "description", content: "Terminal de trading completo: gráfico ao vivo, ordens manuais, gestão de posições e histórico." },
    ],
  }),
});

type Filter = "all" | "open" | "closed" | "win" | "loss";
type Tab = "positions" | "history";
const TIMEFRAMES = ["1m", "3m", "5m", "15m", "30m", "1h"] as const;
type TF = (typeof TIMEFRAMES)[number];
const ASSETS = ["BTC/USDT", "ETH/USDT", "SOL/USDT"];

const ASSET_DEFAULT_QTY: Record<string, number> = {
  "BTC/USDT": 0.02, "ETH/USDT": 0.3, "SOL/USDT": 5,
};
const ASSET_DECIMALS = (a: string) => (a === "EURUSD" ? 5 : 2);

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
function nearestTime(candles: { t?: number; time?: string }[], ts?: number): string | null {
  if (!ts || !candles.length) return null;
  let best = candles[0];
  let bestDiff = Math.abs((best.t ?? 0) - ts);
  for (const c of candles) {
    const d = Math.abs((c.t ?? 0) - ts);
    if (d < bestDiff) { best = c; bestDiff = d; }
  }
  return best.time ?? null;
}

// === Ticker que atualiza o preço de TODAS as ordens abertas a cada N segundos ===
function useOpenOrderTicker() {
  const qc = useQueryClient();
  useEffect(() => {
    let alive = true;
    async function tick() {
      const orders = qc.getQueryData<PaperOrder[]>(["paper-orders"]) ?? [];
      const open = orders.filter((o) => o.status === "OPEN");
      if (!alive || open.length === 0) return;
      const assets = Array.from(new Set(open.map((o) => o.asset)));
      const prices: Record<string, number> = {};
      await Promise.all(assets.map(async (a) => {
        try {
          const c = await fetchLiveCandles(a, "1m", 2);
          const last = c[c.length - 1];
          if (last?.close) prices[a] = last.close;
        } catch { /* ignore */ }
      }));
      if (!alive) return;
      const closed: Trade[] = [];
      const next: PaperOrder[] = orders.map((o) => {
        if (o.status !== "OPEN" || !prices[o.asset]) return o;
        const r = updateOrderWithPrice(o, prices[o.asset]);
        if (r.closed) {
          closed.push(r.closed);
          recordOutcome(o.asset, o.strategy ?? "Manual", r.closed.result === "WIN", 60);
          toast.success(`${o.asset} fechada (${r.closed.result}) ${r.closed.pnl >= 0 ? "+" : ""}$${r.closed.pnl}`);
        }
        return r.order;
      });
      qc.setQueryData<PaperOrder[]>(["paper-orders"], next);
      if (closed.length) {
        qc.setQueryData<Trade[]>(["trades", 50], (prev) => [...closed, ...(prev ?? [])]);
        qc.setQueryData<Trade[]>(["trades", 100], (prev) => [...closed, ...(prev ?? [])]);
        qc.invalidateQueries({ queryKey: ["trades"] });
      }
    }
    tick();
    const id = setInterval(tick, 8_000);
    return () => { alive = false; clearInterval(id); };
  }, [qc]);
}

function OperationsPage() {
  const { data: orders = [] } = usePaperOrders();
  const { data: trades = [] } = useTrades(100);
  const stats = useDashboardStats();
  const risk = useRiskSettings();
  const qc = useQueryClient();

  useOpenOrderTicker();

  const [asset, setAsset] = useState<string>("BTC/USDT");
  const [tf, setTf] = useState<TF>("5m");
  const [filter, setFilter] = useState<Filter>("all");
  const [tab, setTab] = useState<Tab>("positions");
  const { data: candles = [], isFetching } = useCandles(asset, tf);

  const lastPrice = candles.length
    ? (candles[candles.length - 1].close ?? candles[candles.length - 1].price ?? 0)
    : 0;
  const firstClose = candles.length ? (candles[0].close ?? candles[0].price ?? 0) : 0;
  const change = firstClose ? ((lastPrice - firstClose) / firstClose) * 100 : 0;

  // === Order ticket state ===
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [qty, setQty] = useState<number>(ASSET_DEFAULT_QTY[asset] ?? 1);
  const [limitPrice, setLimitPrice] = useState<number>(0);
  const [riskPct, setRiskPct] = useState<number>(risk.data?.maxRiskPerTrade ?? 1);
  const [rr, setRr] = useState<number>(1.8); // risk:reward
  const lastAssetRef = useRef(asset);

  useEffect(() => {
    if (lastAssetRef.current !== asset) {
      setQty(ASSET_DEFAULT_QTY[asset] ?? 1);
      lastAssetRef.current = asset;
    }
  }, [asset]);
  useEffect(() => {
    if (lastPrice && !limitPrice) setLimitPrice(+lastPrice.toFixed(ASSET_DECIMALS(asset)));
  }, [lastPrice, limitPrice, asset]);

  const entryPreview = orderType === "MARKET" ? lastPrice : limitPrice;
  const balance = stats.balance;
  const stopDist = (balance * (riskPct / 100)) / Math.max(qty, 1e-9);
  const stopPreview = entryPreview
    ? side === "BUY" ? +(entryPreview - stopDist).toFixed(ASSET_DECIMALS(asset))
                    : +(entryPreview + stopDist).toFixed(ASSET_DECIMALS(asset))
    : 0;
  const targetPreview = entryPreview
    ? side === "BUY" ? +(entryPreview + stopDist * rr).toFixed(ASSET_DECIMALS(asset))
                    : +(entryPreview - stopDist * rr).toFixed(ASSET_DECIMALS(asset))
    : 0;
  const positionValue = +(qty * entryPreview).toFixed(2);
  const maxLossUsd = +(balance * (riskPct / 100)).toFixed(2);
  const targetGainUsd = +(maxLossUsd * rr).toFixed(2);

  // === Open order action ===
  function openOrder() {
    if (!entryPreview || qty <= 0) {
      toast.error("Preencha quantidade e preço.");
      return;
    }
    if (riskPct > (risk.data?.maxRiskPerTrade ?? 100)) {
      toast.error(`Risco acima do permitido (máx ${risk.data?.maxRiskPerTrade}%).`);
      return;
    }
    const openCount = orders.filter((o) => o.status === "OPEN").length;
    if (openCount >= (risk.data?.maxOpenPositions ?? 5)) {
      toast.error("Limite de posições abertas atingido.");
      return;
    }
    const now = Date.now();
    const newOrder: PaperOrder = {
      id: `man-${now}`,
      asset,
      side,
      qty: +qty,
      entry: +entryPreview.toFixed(ASSET_DECIMALS(asset)),
      current: +entryPreview.toFixed(ASSET_DECIMALS(asset)),
      stop: stopPreview,
      target: targetPreview,
      pnl: 0,
      status: "OPEN",
      strategy: orderType === "MARKET" ? "Manual · Market" : "Manual · Limit",
      openedTs: now,
      openedAt: new Date(now).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };
    qc.setQueryData<PaperOrder[]>(["paper-orders"], (prev) => [newOrder, ...(prev ?? [])]);
    toast.success(`Ordem ${side} ${asset} aberta @ ${fmtNum(entryPreview)}`);
  }

  function closeOrder(id: string, atMarket = true) {
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    const price = atMarket && lastPrice && order.asset === asset ? lastPrice : order.current;
    const dir = order.side === "BUY" ? 1 : -1;
    const pnl = +((price - order.entry) * order.qty * dir).toFixed(2);
    const pnlPct = +(((price - order.entry) / order.entry) * 100 * dir).toFixed(2);
    const now = Date.now();
    const trade: Trade = {
      id: `tr-${order.id}`,
      asset: order.asset, side: order.side,
      entry: order.entry, exit: +price.toFixed(ASSET_DECIMALS(order.asset)),
      qty: order.qty, pnl, pnlPct,
      result: pnl >= 0 ? "WIN" : "LOSS",
      strategy: order.strategy ?? "Manual",
      openedAt: order.openedAt, openedTs: order.openedTs,
      closedTs: now,
      closedAt: new Date(now).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };
    qc.setQueryData<PaperOrder[]>(["paper-orders"], (prev) => (prev ?? []).filter((o) => o.id !== id));
    qc.setQueryData<Trade[]>(["trades", 50], (prev) => [trade, ...(prev ?? [])]);
    qc.setQueryData<Trade[]>(["trades", 100], (prev) => [trade, ...(prev ?? [])]);
    qc.invalidateQueries({ queryKey: ["trades"] });
    recordOutcome(order.asset, order.strategy ?? "Manual", trade.result === "WIN", 60);
    toast.success(`Fechada ${order.asset} (${trade.result}) ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`);
  }

  function reverseOrder(id: string) {
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    closeOrder(id, true);
    const flippedSide = order.side === "BUY" ? "SELL" : "BUY";
    const entry = lastPrice && order.asset === asset ? lastPrice : order.current;
    const dist = Math.abs(order.entry - order.stop);
    const now = Date.now();
    const newOrder: PaperOrder = {
      ...order,
      id: `rev-${now}`,
      side: flippedSide,
      entry: +entry.toFixed(ASSET_DECIMALS(order.asset)),
      current: +entry.toFixed(ASSET_DECIMALS(order.asset)),
      stop: flippedSide === "BUY" ? +(entry - dist).toFixed(ASSET_DECIMALS(order.asset))
                                  : +(entry + dist).toFixed(ASSET_DECIMALS(order.asset)),
      target: flippedSide === "BUY" ? +(entry + dist * rr).toFixed(ASSET_DECIMALS(order.asset))
                                    : +(entry - dist * rr).toFixed(ASSET_DECIMALS(order.asset)),
      pnl: 0,
      status: "OPEN",
      strategy: "Reverse",
      openedTs: now,
      openedAt: new Date(now).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };
    qc.setQueryData<PaperOrder[]>(["paper-orders"], (prev) => [newOrder, ...(prev ?? [])]);
  }

  function closeAll(scope: "all" | "profit" | "loss") {
    const open = orders.filter((o) => o.status === "OPEN");
    const target = open.filter((o) =>
      scope === "all" ? true : scope === "profit" ? o.pnl >= 0 : o.pnl < 0
    );
    target.forEach((o) => closeOrder(o.id, true));
  }

  // === Stats ===
  const wins = trades.filter((t) => t.result === "WIN");
  const losses = trades.filter((t) => t.result === "LOSS");
  const totalClosed = trades.length;
  const winRatePct = totalClosed > 0 ? (wins.length / totalClosed) * 100 : 0;
  const lossRatePct = totalClosed > 0 ? (losses.length / totalClosed) * 100 : 0;
  const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;
  const profitFactor = losses.length && Math.abs(avgLoss) > 0
    ? wins.reduce((s, t) => s + t.pnl, 0) / Math.abs(losses.reduce((s, t) => s + t.pnl, 0))
    : wins.length > 0 ? Infinity : 0;

  const openOnAsset = orders.filter((o) => o.asset === asset && o.status === "OPEN");
  const closedOnAsset = trades.filter((t) => t.asset === asset);
  const firstCandleT = candles.length ? (candles[0].t ?? 0) : 0;

  const markers = useMemo(() => {
    const m: { time: string; price: number; kind: "ENTRY-BUY" | "ENTRY-SELL" | "WIN" | "LOSS" }[] = [];
    for (const o of openOnAsset) {
      const t = nearestTime(candles, o.openedTs);
      if (t) m.push({ time: t, price: o.entry, kind: o.side === "BUY" ? "ENTRY-BUY" : "ENTRY-SELL" });
    }
    for (const tr of closedOnAsset) {
      if (tr.openedTs && tr.openedTs >= firstCandleT) {
        const te = nearestTime(candles, tr.openedTs);
        if (te) m.push({ time: te, price: tr.entry, kind: tr.side === "BUY" ? "ENTRY-BUY" : "ENTRY-SELL" });
      }
      if (tr.closedTs && tr.closedTs >= firstCandleT) {
        const tc = nearestTime(candles, tr.closedTs);
        if (tc) m.push({ time: tc, price: tr.exit, kind: tr.result });
      }
    }
    return m;
  }, [candles, openOnAsset, closedOnAsset, firstCandleT]);

  type Row =
    | { kind: "open"; id: string; asset: string; side: "BUY" | "SELL"; qty: number; entry: number; exit: number; pnl: number; pnlPct: number; status: "ABERTA"; openedAt: string; closedAt: string; duration: string; strategy: string; result: "—" }
    | { kind: "closed"; id: string; asset: string; side: "BUY" | "SELL"; qty: number; entry: number; exit: number; pnl: number; pnlPct: number; status: "FECHADA"; openedAt: string; closedAt: string; duration: string; strategy: string; result: "WIN" | "LOSS" };

  const positionRows: Row[] = orders.map((o) => ({
    kind: "open", id: o.id, asset: o.asset, side: o.side, qty: o.qty,
    entry: o.entry, exit: o.current, pnl: o.pnl,
    pnlPct: pctOf(o.entry, o.current, o.side),
    status: "ABERTA", openedAt: o.openedAt, closedAt: "—",
    duration: durationLabel(o.openedTs),
    strategy: o.strategy ?? "Manual", result: "—",
  }));
  const historyRows: Row[] = (trades as Trade[]).map((t) => ({
    kind: "closed", id: t.id, asset: t.asset, side: t.side, qty: t.qty,
    entry: t.entry, exit: t.exit, pnl: t.pnl,
    pnlPct: t.pnlPct ?? pctOf(t.entry, t.exit, t.side),
    status: "FECHADA", openedAt: t.openedAt ?? "—", closedAt: t.closedAt,
    duration: durationLabel(t.openedTs, t.closedTs),
    strategy: t.strategy, result: t.result,
  }));

  const filteredHistory =
    filter === "win" ? historyRows.filter((r) => r.kind === "closed" && r.result === "WIN")
    : filter === "loss" ? historyRows.filter((r) => r.kind === "closed" && r.result === "LOSS")
    : historyRows;

  const rowsToShow = tab === "positions" ? positionRows : filteredHistory;

  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Terminal de operações</h1>
          <p className="text-sm text-muted-foreground">
            Compre, venda e gerencie posições com preços ao vivo e gestão de risco integrada.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Radio className={`size-3 ${isFetching ? "text-bull animate-pulse" : "text-bull"}`} />
          <span className="text-muted-foreground">Mercado ao vivo · Binance</span>
        </div>
      </div>

      <WarningBanner />

      {/* Top metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard label="Saldo" value={fmtUSD(stats.balance)} icon={Wallet} tone="primary" />
        <MetricCard label="Equity" value={fmtUSD(stats.equity)} icon={Activity}
          tone={stats.equity >= stats.balance ? "bull" : "bear"} />
        <MetricCard label="PnL aberto" value={`${stats.openPnl >= 0 ? "+" : ""}${fmtNum(stats.openPnl)}`}
          icon={Target} tone={stats.openPnl >= 0 ? "bull" : "bear"} />
        <MetricCard label="Win rate" value={`${winRatePct.toFixed(1)}%`} icon={Trophy}
          tone={winRatePct >= 50 ? "bull" : "bear"} />
        <MetricCard label="Profit factor"
          value={Number.isFinite(profitFactor) ? profitFactor.toFixed(2) : "∞"}
          icon={TrendingDown}
          tone={profitFactor >= 1.5 ? "bull" : profitFactor >= 1 ? "primary" : "bear"} />
      </div>

      {/* Asset + price bar */}
      <div className="rounded-xl border border-border bg-card p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-surface p-1">
          {ASSETS.map((a) => (
            <button key={a} type="button" onClick={() => setAsset(a)}
              className={`px-3 h-7 rounded text-xs font-medium ${
                asset === a ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}>{a}</button>
          ))}
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-xl font-mono font-semibold">{lastPrice ? fmtNum(lastPrice) : "—"}</span>
          <span className={`text-xs font-mono ${change >= 0 ? "text-bull" : "text-bear"}`}>
            {change >= 0 ? "▲" : "▼"} {change.toFixed(2)}%
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1.5 rounded-md border border-border bg-surface p-1">
          {TIMEFRAMES.map((t) => (
            <button key={t} type="button" onClick={() => setTf(t)}
              className={`px-3 h-7 rounded text-xs font-medium ${
                tf === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}>{t}</button>
          ))}
        </div>
      </div>

      {/* Chart + Ticket */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Chart */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 space-y-2">
          <div style={{ width: "100%", height: 360 }}>
            <ResponsiveContainer>
              <ComposedChart data={candles} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="opPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.74 0.16 195)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="oklch(0.74 0.16 195)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--grid)" strokeDasharray="3 6" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false} tickLine={false}
                  domain={["dataMin", "dataMax"]} width={64} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "var(--muted-foreground)" }} />
                <Area type="monotone" dataKey="close" stroke="oklch(0.74 0.16 195)" strokeWidth={2} fill="url(#opPrice)" />

                {/* Preview do ticket */}
                {entryPreview > 0 && (
                  <ReferenceLine y={entryPreview} stroke="var(--primary)" strokeDasharray="2 4" strokeOpacity={0.7}
                    label={{ value: `Entrada ${fmtNum(entryPreview)}`, fill: "var(--primary)", fontSize: 10, position: "left" }} />
                )}
                {stopPreview > 0 && (
                  <ReferenceLine y={stopPreview} stroke="oklch(0.65 0.23 25)" strokeDasharray="2 4" strokeOpacity={0.5}
                    label={{ value: `Stop preview`, fill: "oklch(0.65 0.23 25)", fontSize: 10, position: "left" }} />
                )}
                {targetPreview > 0 && (
                  <ReferenceLine y={targetPreview} stroke="oklch(0.74 0.18 152)" strokeDasharray="2 4" strokeOpacity={0.5}
                    label={{ value: `Alvo preview`, fill: "oklch(0.74 0.18 152)", fontSize: 10, position: "left" }} />
                )}

                {openOnAsset.map((o) => (
                  <ReferenceLine key={`tgt-${o.id}`} y={o.target}
                    stroke="oklch(0.74 0.18 152)" strokeDasharray="4 4" strokeOpacity={0.7}
                    label={{ value: `🎯 ${fmtNum(o.target)}`, fill: "oklch(0.74 0.18 152)", fontSize: 10, position: "right" }} />
                ))}
                {openOnAsset.map((o) => (
                  <ReferenceLine key={`stp-${o.id}`} y={o.stop}
                    stroke="oklch(0.65 0.23 25)" strokeDasharray="4 4" strokeOpacity={0.7}
                    label={{ value: `🛑 ${fmtNum(o.stop)}`, fill: "oklch(0.65 0.23 25)", fontSize: 10, position: "right" }} />
                ))}

                {markers.map((m, i) => {
                  const colors = {
                    "ENTRY-BUY":  "oklch(0.74 0.18 152)",
                    "ENTRY-SELL": "oklch(0.78 0.17 60)",
                    "WIN":        "oklch(0.74 0.18 152)",
                    "LOSS":       "oklch(0.65 0.23 25)",
                  };
                  const r = m.kind === "WIN" || m.kind === "LOSS" ? 6 : 4;
                  return (
                    <ReferenceDot key={`mk-${i}-${m.time}-${m.kind}`}
                      x={m.time} y={m.price} r={r}
                      fill={colors[m.kind]} stroke="var(--background)" strokeWidth={2}
                      ifOverflow="extendDomain" />
                  );
                })}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground pt-1 border-t border-border">
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-bull" /> Entrada BUY / WIN</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: "oklch(0.78 0.17 60)" }} /> Entrada SELL</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-bear" /> LOSS</span>
            <span className="ml-auto">{openOnAsset.length} aberta(s) em {asset}</span>
          </div>
        </div>

        {/* Order ticket */}
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Nova ordem</h3>
            <span className="text-[11px] text-muted-foreground">{asset}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setSide("BUY")}
              className={`h-10 rounded-md text-sm font-semibold border transition ${
                side === "BUY" ? "bg-bull/20 border-bull text-bull" : "border-border text-muted-foreground hover:text-foreground"
              }`}>BUY · LONG</button>
            <button type="button" onClick={() => setSide("SELL")}
              className={`h-10 rounded-md text-sm font-semibold border transition ${
                side === "SELL" ? "bg-bear/20 border-bear text-bear" : "border-border text-muted-foreground hover:text-foreground"
              }`}>SELL · SHORT</button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 rounded-md border border-border bg-surface p-1">
            {(["MARKET", "LIMIT"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setOrderType(t)}
                className={`h-7 rounded text-xs font-medium ${
                  orderType === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}>{t === "MARKET" ? "A mercado" : "Limite"}</button>
            ))}
          </div>

          <Field label="Quantidade">
            <input type="number" step="any" min={0} value={qty}
              onChange={(e) => setQty(+e.target.value)}
              className="w-full bg-surface border border-border rounded-md h-9 px-2 text-sm font-mono outline-none focus:ring-1 focus:ring-primary" />
            <div className="flex gap-1 mt-1">
              {[0.25, 0.5, 1, 2].map((mult) => (
                <button key={mult} type="button"
                  onClick={() => setQty(+((ASSET_DEFAULT_QTY[asset] ?? 1) * mult).toFixed(6))}
                  className="flex-1 h-6 rounded text-[10px] border border-border hover:bg-surface text-muted-foreground">
                  {mult}x
                </button>
              ))}
            </div>
          </Field>

          {orderType === "LIMIT" && (
            <Field label="Preço limite">
              <input type="number" step="any" min={0} value={limitPrice}
                onChange={(e) => setLimitPrice(+e.target.value)}
                className="w-full bg-surface border border-border rounded-md h-9 px-2 text-sm font-mono outline-none focus:ring-1 focus:ring-primary" />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Field label="Risco %">
              <input type="number" step="0.1" min={0.1} max={5} value={riskPct}
                onChange={(e) => setRiskPct(+e.target.value)}
                className="w-full bg-surface border border-border rounded-md h-9 px-2 text-sm font-mono outline-none focus:ring-1 focus:ring-primary" />
            </Field>
            <Field label="R:R">
              <input type="number" step="0.1" min={0.5} max={10} value={rr}
                onChange={(e) => setRr(+e.target.value)}
                className="w-full bg-surface border border-border rounded-md h-9 px-2 text-sm font-mono outline-none focus:ring-1 focus:ring-primary" />
            </Field>
          </div>

          <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs space-y-1">
            <Row k="Entrada" v={entryPreview ? fmtNum(entryPreview) : "—"} />
            <Row k="Stop" v={stopPreview ? fmtNum(stopPreview) : "—"} tone="bear" />
            <Row k="Alvo" v={targetPreview ? fmtNum(targetPreview) : "—"} tone="bull" />
            <Row k="Posição" v={fmtUSD(positionValue)} />
            <Row k="Perda máx" v={`-${fmtUSD(maxLossUsd)}`} tone="bear" />
            <Row k="Ganho alvo" v={`+${fmtUSD(targetGainUsd)}`} tone="bull" />
          </div>

          <button type="button" onClick={openOrder}
            className={`h-11 rounded-md text-sm font-semibold flex items-center justify-center gap-2 transition ${
              side === "BUY"
                ? "bg-bull text-white hover:opacity-90"
                : "bg-bear text-white hover:opacity-90"
            }`}>
            <Zap className="size-4" />
            Enviar ordem {side}
          </button>

          {risk.data && riskPct > risk.data.maxRiskPerTrade && (
            <div className="flex items-center gap-2 text-xs text-bear">
              <ShieldAlert className="size-3" />
              Risco acima do máximo permitido ({risk.data.maxRiskPerTrade}%).
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground mr-1">Ações rápidas:</span>
        <QuickBtn onClick={() => closeAll("all")} icon={Power} label="Fechar tudo" tone="bear" />
        <QuickBtn onClick={() => closeAll("profit")} icon={Trophy} label="Fechar lucrativas" tone="bull" />
        <QuickBtn onClick={() => closeAll("loss")} icon={TrendingDown} label="Fechar perdedoras" tone="bear" />
        <span className="ml-auto text-xs text-muted-foreground">
          {orders.length} posições · {wins.length}W / {losses.length}L
        </span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {([["positions", `Posições (${orders.length})`], ["history", `Histórico (${trades.length})`]] as [Tab, string][]).map(([k, lbl]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            className={`px-4 h-9 text-sm font-medium border-b-2 transition ${
              tab === k ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>{lbl}</button>
        ))}
        {tab === "history" && (
          <div className="ml-auto flex gap-1 pb-1">
            {([["all", "Todas"], ["win", "Vitórias"], ["loss", "Perdas"]] as [Filter, string][]).map(([k, lbl]) => (
              <button key={k} type="button" onClick={() => setFilter(k)}
                className={`px-3 h-7 rounded text-[11px] font-medium border ${
                  filter === k ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
                }`}>{lbl}</button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-surface">
              <tr>
                {["Ativo","Lado","Qtd","Entrada","Atual / Saída","PnL","%","Status","Início","Fim","Duração","Estratégia", tab === "positions" ? "Ações" : ""].map((h) => (
                  <th key={h} className="text-left font-medium px-3 py-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rowsToShow.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-10 text-center text-muted-foreground text-xs">
                    {tab === "positions" ? "Nenhuma posição aberta." : "Nenhuma operação no filtro."}
                  </td>
                </tr>
              )}
              {rowsToShow.map((r) => (
                <tr key={`${r.kind}-${r.id}`} className="hover:bg-surface/60">
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap">{r.asset}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                      r.side === "BUY" ? "bg-bull/15 text-bull border border-bull/30"
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
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-primary/15 text-primary border border-primary/30">ABERTA</span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        r.result === "WIN" ? "bg-bull/15 text-bull border border-bull/30"
                        : "bg-bear/15 text-bear border border-bear/30"
                      }`}>{r.result}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.openedAt}</td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.closedAt}</td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                    <span className="inline-flex items-center gap-1"><Clock className="size-3" />{r.duration}</span>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.strategy}</td>
                  {tab === "positions" && (
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => closeOrder(r.id, true)} title="Fechar a mercado"
                          className="size-7 grid place-items-center rounded border border-border hover:bg-bear/15 hover:border-bear/40 hover:text-bear">
                          <X className="size-3.5" />
                        </button>
                        <button type="button" onClick={() => reverseOrder(r.id)} title="Reverter posição"
                          className="size-7 grid place-items-center rounded border border-border hover:bg-primary/15 hover:border-primary/40 hover:text-primary">
                          <RotateCw className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: "bull" | "bear" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className={`font-mono ${tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : ""}`}>{v}</span>
    </div>
  );
}

function QuickBtn({ onClick, icon: Icon, label, tone }: {
  onClick: () => void; icon: typeof Power; label: string; tone: "bull" | "bear";
}) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border transition ${
        tone === "bull"
          ? "border-bull/40 text-bull hover:bg-bull/10"
          : "border-bear/40 text-bear hover:bg-bear/10"
      }`}>
      <Icon className="size-3.5" />{label}
    </button>
  );
}
