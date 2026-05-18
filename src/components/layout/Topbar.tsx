import { Bell, Search, User, Power } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Topbar() {
  return (
    <header className="h-16 shrink-0 flex items-center gap-4 px-4 md:px-6 border-b border-border bg-background/70 backdrop-blur sticky top-0 z-20">
      <div className="md:hidden font-semibold">AutoTrade AI</div>

      <div className="flex-1 max-w-md hidden sm:flex items-center gap-2 px-3 h-9 rounded-md bg-surface border border-border">
        <Search className="size-4 text-muted-foreground" />
        <input
          placeholder="Buscar ativo, estratégia..."
          className="bg-transparent outline-none text-sm flex-1 placeholder:text-muted-foreground"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden lg:flex items-center gap-2 px-3 h-9 rounded-md bg-surface border border-border text-xs">
          <span className="size-2 rounded-full bg-bull animate-pulse" />
          <span className="text-muted-foreground">Sessão simulada · saldo</span>
          <span className="font-mono text-foreground">$ 12.480,55</span>
        </div>
        <button className="size-9 grid place-items-center rounded-md bg-surface border border-border hover:bg-surface-elevated">
          <Bell className="size-4" />
        </button>
        <button className="size-9 grid place-items-center rounded-md bg-surface border border-border hover:bg-surface-elevated">
          <User className="size-4" />
        </button>
        <Link
          to="/login"
          className="size-9 grid place-items-center rounded-md bg-surface border border-border hover:bg-bear/20 hover:border-bear/40"
          title="Sair"
        >
          <Power className="size-4" />
        </Link>
      </div>
    </header>
  );
}
