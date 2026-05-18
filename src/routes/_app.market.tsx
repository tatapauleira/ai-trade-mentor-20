import { createFileRoute } from "@tanstack/react-router";
import { TradingChart } from "@/components/TradingChart";
import { mockAssets, mockPriceCandles, mockTimeframes } from "@/lib/mock-data";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export const Route = createFileRoute("/_app/market")({
  component: MarketPage,
  head: () => ({ meta: [{ title: "Mercado ao vivo — AutoTrade AI" }] }),
});

function MarketPage() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mercado ao vivo</h1>
        <p className="text-sm text-muted-foreground">Candles, volume e indicadores em tempo real (mock).</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <div className="flex items-center gap-3">
              <select className="h-9 rounded-md bg-surface border border-border px-3 text-sm">
                {mockAssets.map(a => <option key={a}>{a}</option>)}
              </select>
              <div className="flex gap-1">
                {mockTimeframes.map((tf,i) => (
                  <button key={tf} className={`h-9 px-2.5 rounded border text-xs ${i===3 ? "border-primary/50 text-primary bg-primary/10" : "border-border text-muted-foreground hover:bg-surface-elevated"}`}>{tf}</button>
                ))}
              </div>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-2xl font-semibold">$ 42.857,30</span>
              <span className="inline-flex items-center gap-1 text-bull text-sm">
                <ArrowUpRight className="size-4" /> +1,82%
              </span>
            </div>
          </div>
          <TradingChart data={mockPriceCandles} dataKey="price" xKey="time" tone="primary" height={420} />
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3">Watchlist</h3>
            <ul className="divide-y divide-border">
              {mockAssets.map((a, i) => {
                const up = i % 2 === 0;
                return (
                  <li key={a} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-medium">{a}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-muted-foreground">{(100 + i * 37).toFixed(2)}</span>
                      <span className={`inline-flex items-center gap-0.5 text-xs ${up ? "text-bull" : "text-bear"}`}>
                        {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                        {(Math.random() * 3).toFixed(2)}%
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3">Indicadores</h3>
            <dl className="grid grid-cols-2 gap-y-2 text-xs">
              {[
                ["RSI 14", "62,1"],["MM 20", "42.610"],["MM 50", "41.980"],
                ["ATR 14", "412"],["Volume", "1,28M"],["VWAP", "42.504"],
              ].map(([k,v]) => (
                <div key={k}>
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-mono">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </>
  );
}
