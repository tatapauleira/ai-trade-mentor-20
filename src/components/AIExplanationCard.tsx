import { BrainCircuit, Sparkles } from "lucide-react";

interface Props {
  asset: string;
  trend: string;
  volatility: string;
  rationale: string;
}

export function AIExplanationCard({ asset, trend, volatility, rationale }: Props) {
  return (
    <div className="rounded-xl border border-primary/30 bg-card p-5 gradient-primary">
      <div className="flex items-center gap-2 mb-3">
        <BrainCircuit className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">Explicação da IA</h3>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-primary">
          <Sparkles className="size-3" /> GPT-5.5 + Quant
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
        <Tag label="Ativo" value={asset} />
        <Tag label="Tendência" value={trend} />
        <Tag label="Volatilidade" value={volatility} />
      </div>

      <p className="text-sm leading-relaxed text-foreground/90">{rationale}</p>

      <div className="mt-4 text-[11px] text-muted-foreground border-t border-border pt-3">
        Operação probabilística. A IA aprende com win rate, drawdown, profit factor e Sharpe ratio para reajustar pesos.
      </div>
    </div>
  );
}

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface border border-border px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm capitalize">{value}</div>
    </div>
  );
}
