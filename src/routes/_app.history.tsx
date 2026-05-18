import { createFileRoute } from "@tanstack/react-router";
import { mockTrades } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/history")({
  component: HistoryPage,
  head: () => ({ meta: [{ title: "Histórico — AutoTrade AI" }] }),
});

function HistoryPage() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Histórico de operações</h1>
        <p className="text-sm text-muted-foreground">Trades encerrados com resultado e estratégia.</p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-surface">
              <tr>{["Ativo","Lado","Entrada","Saída","Qtd","PnL","Resultado","Estratégia","Encerrado"].map(h => (
                <th key={h} className="text-left font-medium px-4 py-2">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockTrades.map((t) => (
                <tr key={t.id} className="hover:bg-surface/60">
                  <td className="px-4 py-3 font-medium">{t.asset}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      t.side === "BUY"
                        ? "bg-bull/15 text-bull border border-bull/30"
                        : "bg-bear/15 text-bear border border-bear/30"
                    }`}>{t.side}</span>
                  </td>
                  <td className="px-4 py-3 font-mono">{t.entry.toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono">{t.exit.toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono">{t.qty}</td>
                  <td className={`px-4 py-3 font-mono ${t.pnl >= 0 ? "text-bull" : "text-bear"}`}>
                    {t.pnl >= 0 ? "+" : ""}{t.pnl.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${t.result === "WIN" ? "text-bull" : "text-bear"}`}>{t.result}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{t.strategy}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.closedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
