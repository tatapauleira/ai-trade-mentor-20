import { AlertTriangle } from "lucide-react";

export function WarningBanner({ message }: { message?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
      <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
      <p className="text-foreground/90">
        {message ?? "Este app não garante lucro. Trading envolve risco. Modo simulação ativo — nenhuma ordem real será executada."}
      </p>
    </div>
  );
}
