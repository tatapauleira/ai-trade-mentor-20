import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";
import { useProfile, useTrades } from "@/hooks/use-trading-data";
import { isSupabaseConfigured } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Configurações — AutoTrade AI" }] }),
});

function SettingsPage() {
  const { mode, user, isConfigured } = useAuth();
  const profile = useProfile();
  const trades = useTrades(200);
  const connected = isConfigured && mode === "live";

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Conta e conexão Supabase.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Perfil">
          <Row label="Nome" value={profile.data?.full_name || "—"} />
          <Row label="E-mail" value={profile.data?.email || user?.email || "—"} />
          <Row label="Modo" value={mode === "live" ? "Supabase (live)" : "Mock local"} />
        </Card>

        <Card title="Conexão Supabase">
          <p className="text-xs text-muted-foreground mb-3">
            Variáveis: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local
          </p>
          <div className="rounded-md bg-surface border border-border p-3 text-xs font-mono">
            status:{" "}
            <span className={connected ? "text-bull" : "text-warning"}>
              {connected ? "conectado" : isConfigured ? "configurado · sem sessão" : "desconectado (mock)"}
            </span>
          </div>
        </Card>

        <Card title="IA / Aprendizado">
          <Row label="Trades analisados" value={String(trades.data?.length ?? 0)} />
          <Row label="Paper balance" value={String(profile.data?.paper_balance ?? "—")} />
          <Row label="Aprendizado" value="ativo · logs em ai_learning_logs" />
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
