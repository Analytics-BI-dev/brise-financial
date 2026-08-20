import { Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import logo from "@/assets/antologia-logo.png";
import { cn } from "@/lib/utils";

const navegacao = [
  { to: "/", label: "Dashboard" },
  { to: "/premissas", label: "Premissas" },
  { to: "/fluxo", label: "Fluxo de caixa" },
  { to: "/apresentacao", label: "Apresentação" },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="mx-auto w-full max-w-[1360px] px-5 pb-32 pt-10 sm:px-10">{children}</main>
      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-[1360px] flex-wrap items-center justify-between gap-3 px-5 py-8 text-xs font-light text-muted-foreground sm:px-10">
          <span>Antologia Incorporadora - Material confidencial para investidores</span>
          <span>Projeções baseadas na planilha oficial da operação</span>
        </div>
      </footer>
    </div>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto grid w-full max-w-[1360px] grid-cols-[minmax(0,1fr)_auto] items-center gap-6 px-5 py-5 sm:px-10">
        <Link to="/" className="flex min-w-0 items-center gap-4">
          <img
            src={logo}
            alt="Antologia Incorporadora"
            className="h-7 w-auto shrink-0 brightness-0 dark:brightness-100"
          />
          <span className="hidden border-l border-border pl-4 text-[11px] font-light uppercase tracking-[0.2em] text-muted-foreground md:inline">
            Simulador de investimentos
          </span>
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto">
          {navegacao.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className={cn(
                "whitespace-nowrap px-3 py-2 text-[11px] font-light uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground",
              )}
              activeProps={{ className: "text-foreground" }}
            >
              {label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

function ThemeToggle() {
  const [escuro, setEscuro] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", escuro);
  }, [escuro]);

  return (
    <button
      type="button"
      aria-label="Alternar tema"
      onClick={() => setEscuro((v) => !v)}
      className="ml-3 flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
    >
      {escuro ? <Sun className="size-3.5" strokeWidth={1.25} /> : <Moon className="size-3.5" strokeWidth={1.25} />}
    </button>
  );
}
