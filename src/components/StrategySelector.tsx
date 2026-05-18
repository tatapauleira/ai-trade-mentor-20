import { useStrategies } from "@/hooks/use-trading-data";

export function StrategySelector() {
  const { data: strategies = [], isLoading } = useStrategies();

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold">Estratégias</h3>
        <span className="text-xs text-muted-foreground">
          {isLoading ? "Carregando…" : "Pesos ajustados pela IA"}
        </span>
      </div>
      <div className="divide-y divide-border">
        {strategies.map((s) => (
          <div key={s.id} className="px-5 py-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{s.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-elevated border border-border text-muted-foreground">
                  peso {(s.weight * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
              <div className="mt-2 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${s.weight * 100 * 3.5}%` }} />
              </div>
            </div>
            <div className="hidden md:grid grid-cols-3 gap-4 text-right text-xs w-64">
              <div>
                <div className="text-muted-foreground">Win rate</div>
                <div className={`font-mono ${s.winRate >= 55 ? "text-bull" : "text-foreground"}`}>
                  {s.winRate}%
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Trades</div>
                <div className="font-mono">{s.trades}</div>
              </div>
              <div>
                <div className="text-muted-foreground">PF</div>
                <div className={`font-mono ${s.profitFactor >= 1.5 ? "text-bull" : "text-warning"}`}>
                  {s.profitFactor.toFixed(2)}
                </div>
              </div>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={s.enabled} className="peer sr-only" />
              <span className="w-10 h-5 rounded-full bg-surface-elevated border border-border relative peer-checked:bg-primary/30 peer-checked:border-primary/60 transition-colors">
                <span className="absolute top-0.5 left-0.5 size-4 rounded-full bg-foreground transition-transform peer-checked:translate-x-5" />
              </span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}


