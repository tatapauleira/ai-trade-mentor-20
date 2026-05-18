import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bot, ShieldCheck, LineChart } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Entrar — AutoTrade AI" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Brand panel */}
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
            Decisões probabilísticas.<br />
            <span className="text-primary">Controle de risco</span> em cada ordem.
          </h2>
          <p className="mt-4 text-sm text-muted-foreground max-w-md">
            IA híbrida com GPT-5.5 + modelo quantitativo. Backtesting, paper trading
            e Risk Manager integrados desde o primeiro dia.
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

        <p className="text-xs text-muted-foreground">
          Este app não garante lucro. Trading envolve risco.
        </p>
      </div>

      {/* Form */}
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
            {mode === "login" ? "Acesse seu painel de trading simulado." : "Comece em modo simulação. Sem risco real."}
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); navigate({ to: "/" }); }}
            className="mt-8 space-y-3"
          >
            {mode === "signup" && (
              <Input label="Nome" type="text" placeholder="Seu nome" />
            )}
            <Input label="E-mail" type="email" placeholder="voce@email.com" />
            <Input label="Senha"  type="password" placeholder="••••••••" />

            <button className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 mt-2">
              {mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            ou
            <div className="h-px flex-1 bg-border" />
          </div>

          <Link to="/" className="block w-full h-10 rounded-md border border-border text-sm font-medium hover:bg-surface-elevated grid place-items-center">
            Continuar como visitante (demo)
          </Link>

          <p className="mt-6 text-sm text-center text-muted-foreground">
            {mode === "login" ? "Não tem conta?" : "Já tem conta?"}{" "}
            <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-primary hover:underline">
              {mode === "login" ? "Criar agora" : "Entrar"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function Input({ label, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        {...rest}
        className="mt-1 w-full h-10 rounded-md bg-surface border border-border px-3 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
