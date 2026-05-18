import { usePaperOrders } from "@/hooks/use-trading-data";
import { X } from "lucide-react";

export function PaperOrderTable() {
  const { data: orders = [], isLoading } = usePaperOrders();

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold">Ordens em paper trading</h3>
        <span className="text-xs text-muted-foreground">
          {isLoading ? "…" : `${orders.length} abertas`}
        </span>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-surface">
            <tr>
              {["Ativo", "Lado", "Qtd", "Entrada", "Atual", "Stop", "Alvo", "PnL", "Aberto", ""].map((h) => (
                <th key={h} className="text-left font-medium px-4 py-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.length === 0 && !isLoading && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground text-xs">
                  Nenhuma ordem paper aberta.
                </td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-surface/60">
                <td className="px-4 py-3 font-medium">{o.asset}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      o.side === "BUY"
                        ? "bg-bull/15 text-bull border border-bull/30"
                        : "bg-bear/15 text-bear border border-bear/30"
                    }`}
                  >
                    {o.side}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono">{o.qty}</td>
                <td className="px-4 py-3 font-mono">{o.entry.toLocaleString()}</td>
                <td className="px-4 py-3 font-mono">{o.current.toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-bear">{o.stop.toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-bull">{o.target.toLocaleString()}</td>
                <td className={`px-4 py-3 font-mono ${o.pnl >= 0 ? "text-bull" : "text-bear"}`}>
                  {o.pnl >= 0 ? "+" : ""}
                  {o.pnl.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{o.openedAt}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="size-7 grid place-items-center rounded-md border border-border hover:bg-bear/15 hover:border-bear/40 hover:text-bear"
                    title="Fechar ordem (em breve)"
                  >
                    <X className="size-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
