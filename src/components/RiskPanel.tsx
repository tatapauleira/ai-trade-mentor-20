import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { useRiskSettings, useSaveRiskSettings } from "@/hooks/use-trading-data";
import type { RiskSettings } from "@/lib/types";

export function RiskPanel() {
  const { data: remote } = useRiskSettings();
  const save = useSaveRiskSettings();
  const [values, setValues] = useState({
    capital: "10000",
    riskPerOp: "1.0",
    dailyLoss: "3.0",
    drawdown: "10",
    maxPos: "5",
  });

  useEffect(() => {
    if (!remote) return;
    setValues({
      capital: String(remote.paperBalance),
      riskPerOp: String(remote.maxRiskPerTrade),
      dailyLoss: String(remote.maxDailyLoss),
      drawdown: String(remote.maxDrawdown),
      maxPos: String(remote.maxOpenPositions),
    });
  }, [remote]);

  function toSettings(): RiskSettings {
    return {
      paperBalance: Number(values.capital),
      maxRiskPerTrade: Number(values.riskPerOp),
      maxDailyLoss: Number(values.dailyLoss),
      maxDrawdown: Number(values.drawdown),
      maxOpenPositions: Number(values.maxPos),
    };
  }

  async function handleSave() {
    await save.mutateAsync(toSettings());
  }

  const fields = [
    { id: "capital", label: "Capital inicial simulado (USD)" },
    { id: "riskPerOp", label: "Risco máximo por operação (%)" },
    { id: "dailyLoss", label: "Perda máxima diária (%)" },
    { id: "drawdown", label: "Limite de drawdown (%)" },
    { id: "maxPos", label: "Máx. posições abertas" },
  ] as const;

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

      {save.isError && (
        <p className="mt-3 text-xs text-bear">{(save.error as Error).message}</p>
      )}
      {save.isSuccess && (
        <p className="mt-3 text-xs text-bull">Configuração salva no Supabase.</p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={save.isPending}
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {save.isPending ? "Salvando…" : "Salvar configuração"}
        </button>
        <button
          type="button"
          onClick={() =>
            setValues({
              capital: "10000",
              riskPerOp: "1.0",
              dailyLoss: "3.0",
              drawdown: "10",
              maxPos: "5",
            })
          }
          className="h-9 px-4 rounded-md border border-border text-sm hover:bg-surface-elevated"
        >
          Restaurar padrões
        </button>
      </div>
    </div>
  );
}
