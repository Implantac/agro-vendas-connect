import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, LogOut, LayoutDashboard, Search, Bell } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/catalogo", label: "Catálogo" },
  { to: "/como-funciona", label: "Como funciona" },
  { to: "/seguranca", label: "Segurança" },
  { to: "/central-de-ajuda", label: "Ajuda" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6">
        <Link to="/" aria-label="DDP AGRO — início">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-sm px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-forest"
              activeProps={{ className: "text-forest bg-secondary" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/app">
                  <LayoutDashboard className="mr-1.5 h-4 w-4" /> Meu painel
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => void signOut()}>
                <LogOut className="mr-1.5 h-4 w-4" /> Sair
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/entrar">Entrar</Link>
              </Button>
              <Button asChild size="sm" className="bg-forest hover:bg-forest/90">
                <Link to="/cadastro">Solicitar acesso</Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-border lg:hidden"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div className={cn("border-t border-border bg-background lg:hidden", open ? "block" : "hidden")}>
        <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="rounded-sm px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-2 flex gap-2">
            {user ? (
              <>
                <Button asChild variant="outline" className="flex-1">
                  <Link to="/app" onClick={() => setOpen(false)}>
                    Meu painel
                  </Link>
                </Button>
                <Button variant="ghost" onClick={() => void signOut()}>
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="outline" className="flex-1">
                  <Link to="/entrar" onClick={() => setOpen(false)}>
                    Entrar
                  </Link>
                </Button>
                <Button asChild className="flex-1 bg-forest hover:bg-forest/90">
                  <Link to="/cadastro" onClick={() => setOpen(false)}>
                    Solicitar acesso
                  </Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
