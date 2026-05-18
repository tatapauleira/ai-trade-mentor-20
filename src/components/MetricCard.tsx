import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface Props {
  label: string;
  value: string;
  icon?: LucideIcon;
  delta?: number;
  hint?: string;
  tone?: "bull" | "bear" | "neutral" | "primary";
}

export function MetricCard({ label, value, icon: Icon, delta, hint, tone = "neutral" }: Props) {
  const toneRing = {
    bull: "border-bull/30",
    bear: "border-bear/30",
    primary: "border-primary/30",
    neutral: "border-border",
  }[tone];

  const toneText = {
    bull: "text-bull",
    bear: "text-bear",
    primary: "text-primary",
    neutral: "text-foreground",
  }[tone];

  return (
    <div className={`rounded-xl bg-card border ${toneRing} p-5 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        {Icon && (
          <span className="size-8 grid place-items-center rounded-md bg-surface-elevated border border-border">
            <Icon className={`size-4 ${toneText}`} />
          </span>
        )}
      </div>
      <div className={`text-2xl font-semibold font-mono ${toneText}`}>{value}</div>
      <div className="flex items-center justify-between text-xs">
        {delta !== undefined ? (
          <span className={`inline-flex items-center gap-1 ${delta >= 0 ? "text-bull" : "text-bear"}`}>
            {delta >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {delta >= 0 ? "+" : ""}{delta.toFixed(2)}%
          </span>
        ) : <span />}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
