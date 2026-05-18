import { useState } from "react";
import { Shield } from "lucide-react";

const fields = [
  { id: "capital",    label: "Capital inicial simulado (USD)", default: "10000" },
  { id: "riskPerOp",  label: "Risco máximo por operação (%)",  default: "1.0" },
  { id: "dailyLoss",  label: "Perda máxima diária (%)",        default: "3.0" },
  { id: "maxOps",     label: "Máx. operações por dia",          default: "8" },
  { id: "lossStreak", label: "Pausar após N perdas seguidas",   default: "3" },
  { id: "drawdown",   label: "Limite de drawdown (%)",          default: "10" },
  { id: "maxPos",     label: "Tamanho máximo da posição (%)",   default: "20" },
];

export function RiskPanel() {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.id, f.default])),
  );

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">Risk Manager</h3>
        <span className="ml-auto text-[10px] uppercase tracking-widest text-bull">Ativo</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map((f) => (
          <label key={f.id} className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">{f.label}</span>
            <input
              value={values[f.id]}
              onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
              className="h-9 rounded-md bg-surface border border-border px-3 text-sm font-mono outline-none focus:border-primary"
            />
          </label>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          Salvar configuração
        </button>
        <button className="h-9 px-4 rounded-md border border-border text-sm hover:bg-surface-elevated">
          Restaurar padrões
        </button>
      </div>
    </div>
  );
}
