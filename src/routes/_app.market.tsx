import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TradingChart } from "@/components/TradingChart";
import { ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
import { useAssets, useCandles, useRefreshMarketOnMount, useUpdateMarketData } from "@/hooks/use-trading-data";
import { TIMEFRAMES } from "@/lib/types";
import { fmtNum } from "@/lib/format";

export const Route = createFileRoute("/_app/market")({
  component: MarketPage,
  head: () => ({ meta: [{ title: "Mercado ao vivo — AutoTrade AI" }] }),
});

function MarketPage() {
  const { data: assets = [] } = useAssets();
  const [asset, setAsset] = useState("BTC/USDT");
  const [timeframe, setTimeframe] = useState("1h");
  useRefreshMarketOnMount(asset);
  const { data: candles = [], isLoading } = useCandles(asset, timeframe);
  const updateMarket = useUpdateMarketData();

  const last = candles[candles.length - 1];
  const price = last?.price ?? last?.close ?? 0;

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mercado ao vivo</h1>
          <p className="text-sm text-muted-foreground">Candles do Supabase · atualização via Edge Function.</p>
        </div>
        <button
          type="button"
          onClick={() => updateMarket.mutate([asset])}
          disabled={updateMarket.isPending}
          className="h-9 px-3 rounded-md border border-border text-sm inline-flex items-center gap-2 hover:bg-surface-elevated"
        >
          <RefreshCw className={`size-4 ${updateMarket.isPending ? "animate-spin" : ""}`} />
          Atualizar dados
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                className="h-9 rounded-md bg-surface border border-border px-3 text-sm"
              >
                {assets.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <div className="flex gap-1">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setTimeframe(tf)}
                    className={`h-9 px-2.5 rounded border text-xs ${
                      tf === timeframe
                        ? "border-primary/50 text-primary bg-primary/10"
                        : "border-border text-muted-foreground hover:bg-surface-elevated"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-2xl font-semibold">
                {isLoading ? "…" : `$ ${fmtNum(price)}`}
              </span>
              <span className="inline-flex items-center gap-1 text-bull text-sm">
                <ArrowUpRight className="size-4" /> live
              </span>
            </div>
          </div>
          <TradingChart data={candles} dataKey="price" xKey="time" tone="primary" height={420} />
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">Watchlist</h3>
          <ul className="divide-y divide-border">
            {assets.map((a, i) => (
              <li key={a} className="flex items-center justify-between py-2 text-sm">
                <button type="button" className="font-medium hover:text-primary" onClick={() => setAsset(a)}>
                  {a}
                </button>
                <span className={`inline-flex items-center gap-0.5 text-xs ${i % 2 === 0 ? "text-bull" : "text-bear"}`}>
                  {i % 2 === 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                  —
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
