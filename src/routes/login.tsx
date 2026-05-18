import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bot, ShieldCheck, LineChart } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Entrar — AutoTrade AI" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const { signInWithEmail, signUpWithEmail, signInAsDemo, isConfigured } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isConfigured) {
        if (mode === "login") await signInWithEmail(email, password);
        else await signUpWithEmail(email, password, name);
      }
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemo() {
    setError(null);
    setLoading(true);
    try {
      if (isConfigured) await signInAsDemo();
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar em demo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-10 border-r border-border bg-sidebar">
        <div className="flex items-center gap-2">
          <div className="size-10 rounded-lg gradient-primary border border-primary/40 grid place-items-center glow-primary">
            <Bot className="size-5 text-primary" />
          </div>
          <div>
            <div className="font-semibold tracking-tight">AutoTrade AI</div>
            <div className="text-[10px] uppercase tracking-widest text-primary">trading inteligente</div>
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-semibold tracking-tight leading-tight">
            Decisões probabilísticas.
            <br />
            <span className="text-primary">Controle de risco</span> em cada ordem.
          </h2>
          <p className="mt-4 text-sm text-muted-foreground max-w-md">
            IA híbrida com modelo quantitativo. Backtesting, paper trading e Risk Manager integrados.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {[
              { Icon: LineChart, t: "Sinais BUY · SELL · WAIT com confiança em %" },
              { Icon: ShieldCheck, t: "Toda ordem passa pelo Risk Manager" },
              { Icon: Bot, t: "A IA aprende com cada trade encerrado" },
            ].map(({ Icon, t }) => (
              <li key={t} className="flex items-center gap-3">
                <span className="size-8 grid place-items-center rounded-md bg-surface-elevated border border-border">
                  <Icon className="size-4 text-primary" />
                </span>
                <span className="text-foreground/90">{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">Este app não garante lucro. Trading envolve risco.</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="size-9 rounded-lg gradient-primary border border-primary/40 grid place-items-center">
              <Bot className="size-5 text-primary" />
            </div>
            <span className="font-semibold">AutoTrade AI</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "login" ? "Entrar na sua conta" : "Criar conta"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isConfigured
              ? "Conectado ao Supabase · paper trading apenas."
              : "Supabase não configurado — modo mock local."}
          </p>

          {error && (
            <p className="mt-4 text-sm text-bear border border-bear/30 bg-bear/10 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-3">
            {mode === "signup" && (
              <Field label="Nome" value={name} onChange={setName} placeholder="Seu nome" />
            )}
            <Field label="E-mail" type="email" value={email} onChange={setEmail} placeholder="voce@email.com" />
            <Field label="Senha" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 mt-2 disabled:opacity-50"
            >
              {loading ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />ou<div className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={handleDemo}
            disabled={loading}
            className="w-full h-10 rounded-md border border-border text-sm font-medium hover:bg-surface-elevated disabled:opacity-50"
          >
            {isConfigured ? "Entrar com sessão anônima (demo)" : "Continuar como visitante (mock)"}
          </button>

          <p className="mt-6 text-sm text-center text-muted-foreground">
            {mode === "login" ? "Não tem conta?" : "Já tem conta?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-primary hover:underline"
            >
              {mode === "login" ? "Criar agora" : "Entrar"}
            </button>
          </p>

          <Link to="/" className="mt-4 block text-center text-xs text-muted-foreground hover:text-foreground">
            Voltar ao painel
          </Link>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-10 rounded-md bg-surface border border-border px-3 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
