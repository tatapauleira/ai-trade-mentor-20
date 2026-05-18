import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Configurações — AutoTrade AI" }] }),
});

function SettingsPage() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Conta, preferências e conexão com Supabase.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Perfil">
          <Row label="Nome"  value="Trader Sim" />
          <Row label="E-mail" value="trader@autotrade.ai" />
          <Row label="Plano" value="Simulação" />
        </Card>

        <Card title="Preferências">
          <Toggle label="Notificações de sinais" defaultChecked />
          <Toggle label="Alertas de drawdown" defaultChecked />
          <Toggle label="Modo simulação apenas" defaultChecked />
        </Card>

        <Card title="Conexão Supabase">
          <p className="text-xs text-muted-foreground mb-3">
            Configure <code className="font-mono text-foreground">VITE_SUPABASE_URL</code> e{" "}
            <code className="font-mono text-foreground">VITE_SUPABASE_ANON_KEY</code> e edite{" "}
            <code className="font-mono text-foreground">src/integrations/supabase/client.ts</code>.
          </p>
          <div className="rounded-md bg-surface border border-border p-3 text-xs font-mono text-muted-foreground">
            status: <span className="text-warning">desconectado (modo mock)</span>
          </div>
        </Card>

        <Card title="IA">
          <Row label="Motor de raciocínio" value="GPT-5.5" />
          <Row label="Motor quantitativo" value="Python (TS Forecast)" />
          <Row label="Aprendizado" value="ativo · 142 trades analisados" />
        </Card>
      </div>
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
function Toggle({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center justify-between text-sm py-1.5 cursor-pointer">
      <span>{label}</span>
      <input type="checkbox" defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="w-10 h-5 rounded-full bg-surface-elevated border border-border relative peer-checked:bg-primary/30 peer-checked:border-primary/60 transition-colors">
        <span className="absolute top-0.5 left-0.5 size-4 rounded-full bg-foreground transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
