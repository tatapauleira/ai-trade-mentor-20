import { createFileRoute } from "@tanstack/react-router";
import { useTrades } from "@/hooks/use-trading-data";
import { fmtNum } from "@/lib/format";

export const Route = createFileRoute("/_app/history")({
  component: HistoryPage,
  head: () => ({ meta: [{ title: "Histórico — AutoTrade AI" }] }),
});

function HistoryPage() {
  const { data: trades = [], isLoading } = useTrades();

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Histórico</h1>
        <p className="text-sm text-muted-foreground">Trades encerrados em paper trading.</p>
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-surface">
              <tr>
                {["Ativo", "Lado", "Entrada", "Saída", "Qtd", "PnL", "Resultado", "Estratégia", "Fechado"].map((h) => (
                  <th key={h} className="text-left font-medium px-4 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground text-xs">
                    Carregando…
                  </td>
                </tr>
              )}
              {!isLoading && trades.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground text-xs">
                    Nenhum trade encerrado ainda.
                  </td>
                </tr>
              )}
              {trades.map((t) => (
                <tr key={t.id} className="hover:bg-surface/60">
                  <td className="px-4 py-3 font-medium">{t.asset}</td>
                  <td className="px-4 py-3">{t.side}</td>
                  <td className="px-4 py-3 font-mono">{fmtNum(t.entry)}</td>
                  <td className="px-4 py-3 font-mono">{fmtNum(t.exit)}</td>
                  <td className="px-4 py-3 font-mono">{t.qty}</td>
                  <td className={`px-4 py-3 font-mono ${t.pnl >= 0 ? "text-bull" : "text-bear"}`}>
                    {t.pnl >= 0 ? "+" : ""}
                    {t.pnl.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">{t.result}</td>
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
