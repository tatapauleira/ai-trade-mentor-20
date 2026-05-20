import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, LineChart, BrainCircuit, Layers, FlaskConical,
  PlayCircle, History, Shield, Settings, Bot, ListChecks,
} from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/market", label: "Mercado ao vivo", icon: LineChart },
  { to: "/ai-trader", label: "IA Trader", icon: BrainCircuit },
  { to: "/strategies", label: "Estratégias", icon: Layers },
  { to: "/backtesting", label: "Backtesting", icon: FlaskConical },
  { to: "/paper-trading", label: "Paper Trading", icon: PlayCircle },
  { to: "/operations", label: "Operações", icon: ListChecks },
  { to: "/history", label: "Histórico", icon: History },
  { to: "/risk", label: "Gestão de risco", icon: Shield },
  { to: "/settings", label: "Configurações", icon: Settings },
];

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 bg-sidebar border-r border-sidebar-border">
      <div className="h-16 flex items-center gap-2 px-5 border-b border-sidebar-border">
        <div className="size-9 rounded-lg gradient-primary border border-primary/40 grid place-items-center glow-primary">
          <Bot className="size-5 text-primary" />
        </div>
        <div className="leading-tight">
          <div className="font-semibold tracking-tight text-sidebar-foreground">AutoTrade</div>
          <div className="text-[10px] uppercase tracking-widest text-primary">AI · Sim</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {nav.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? "bg-sidebar-accent text-foreground border border-primary/30"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="rounded-md bg-surface-elevated border border-border p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 mb-1">
            <span className="size-2 rounded-full bg-bull animate-pulse" />
            <span className="text-foreground font-medium">IA ativa</span>
          </div>
          Analisando 7 ativos · modo simulação
        </div>
      </div>
    </aside>
  );
}
