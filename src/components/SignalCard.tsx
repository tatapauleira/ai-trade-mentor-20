import type { AISignal } from "@/lib/types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const kindMap = {
  BUY:  { label: "BUY",  cls: "text-bull border-bull/40 bg-bull/10",   Icon: TrendingUp,   glow: "glow-bull" },
  SELL: { label: "SELL", cls: "text-bear border-bear/40 bg-bear/10",   Icon: TrendingDown, glow: "glow-bear" },
  WAIT: { label: "WAIT", cls: "text-neutral border-border bg-surface", Icon: Minus,        glow: "" },
} as const;

export function SignalCard({ signal, compact = false }: { signal: AISignal; compact?: boolean }) {
  const k = kindMap[signal.kind];
  return (
    <div className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{signal.asset}</div>
          <div className="text-[11px] text-muted-foreground">{signal.strategy} · {signal.createdAt}</div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold ${k.cls} ${k.glow}`}>
          <k.Icon className="size-3.5" />
          {k.label}
        </span>
      </div>

      {!compact && (
        <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{signal.rationale}</p>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <Metric label="Entrada" value={signal.entry} />
        <Metric label="Stop"    value={signal.stop} tone="bear" />
        <Metric label="Alvo"    value={signal.target} tone="bull" />
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-muted-foreground">Confiança</span>
          <span className="font-mono">{signal.confidence}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-surface-elevated overflow-hidden">
          <div
            className="h-full bg-primary"
            style={{ width: `${signal.confidence}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: "bull" | "bear" }) {
  const toneCls = tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : "text-foreground";
  return (
    <div className="rounded-md bg-surface border border-border px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-mono text-sm ${toneCls}`}>{value.toLocaleString()}</div>
    </div>
  );
}
