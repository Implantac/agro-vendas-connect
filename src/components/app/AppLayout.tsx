import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Gauge,
  Handshake,
  Heart,
  HelpCircle,
  Home,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  MessageSquare,
  PlusCircle,
  Search,
  Settings,
  Building2,
  User,
  X,
  ClipboardList,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { fetchUnreadNotificationsCount } from "@/lib/app-queries";
import { cn } from "@/lib/utils";

const NAV_GROUPS = [
  {
    label: "Início",
    items: [{ to: "/app", icon: LayoutDashboard, label: "Dashboard", exact: true }],
  },
  {
    label: "Negócios",
    items: [
      { to: "/app/comprar", icon: Search, label: "Comprar máquinas" },
      { to: "/app/negociacoes", icon: Handshake, label: "Minhas negociações" },
      { to: "/app/propostas", icon: Gauge, label: "Propostas" },
      { to: "/app/favoritos", icon: Heart, label: "Favoritos" },
    ],
  },
  {
    label: "Vendas",
    items: [
      { to: "/app/meus-anuncios", icon: ListChecks, label: "Meus anúncios" },
      { to: "/app/publicar", icon: PlusCircle, label: "Publicar anúncio" },
    ],
  },
  {
    label: "Comunicação",
    items: [
      { to: "/app/mensagens", icon: MessageSquare, label: "Mensagens" },
      { to: "/app/notificacoes", icon: Bell, label: "Notificações" },
    ],
  },
  {
    label: "Conta",
    items: [
      { to: "/app/perfil", icon: User, label: "Meu perfil" },
    ],
  },
] as const;

const BOTTOM_NAV = [
  { to: "/app", icon: Home, label: "Início", exact: true },
  { to: "/app/comprar", icon: Search, label: "Buscar" },
  { to: "/app/publicar", icon: PlusCircle, label: "Vender", highlight: true },
  { to: "/app/mensagens", icon: MessageSquare, label: "Chat" },
  { to: "/app/perfil", icon: User, label: "Perfil" },
] as const;

export function AppLayout() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileMenu, setMobileMenu] = useState(false);
  const [search, setSearch] = useState("");

  const { data: unread = 0 } = useQuery({
    queryKey: ["notifications", "unread", user?.id],
    queryFn: () => fetchUnreadNotificationsCount(user!.id),
    enabled: Boolean(user),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/entrar", search: { redirect: "/app" } });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando sua área...</p>
      </div>
    );
  }

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    void navigate({ to: "/app/comprar", search: search ? { q: search } : {} });
    setMobileMenu(false);
  }

  async function handleSignOut() {
    await signOut();
    void navigate({ to: "/", replace: true });
  }

  const firstName = profile?.full_name?.split(" ")[0] ?? "Membro";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border bg-card">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <button
            className="rounded-md p-2 text-forest hover:bg-secondary lg:hidden"
            onClick={() => setMobileMenu(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/app" className="flex items-center gap-2.5">
            <Logo className="h-8 w-8" />
            <span className="leading-tight">
              <span className="block font-display text-base font-bold tracking-tight text-forest">
                DDP <span className="text-accent">AGRO</span>
              </span>
              <span className="hidden text-[10px] uppercase tracking-widest text-muted-foreground sm:block">
                Marketplace de Máquinas Agrícolas
              </span>
            </span>
          </Link>

          <form onSubmit={submitSearch} className="mx-auto hidden w-full max-w-xl md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar máquinas, marcas, modelos..."
                className="h-10 w-full rounded-md border border-border bg-secondary/60 pl-9 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:bg-card"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1">
            <Button asChild variant="ghost" size="icon" className="text-forest" aria-label="Ajuda">
              <Link to="/central-de-ajuda">
                <HelpCircle className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" className="text-forest" aria-label="Mensagens">
              <Link to="/app/mensagens">
                <MessageSquare className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" className="relative text-forest" aria-label="Notificações">
              <Link to="/app/notificacoes">
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-1 flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-secondary">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest text-xs font-bold text-primary-foreground">
                    {firstName.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="hidden text-left leading-tight sm:block">
                    <span className="block text-sm font-semibold text-forest">{firstName}</span>
                    <span className="block text-[11px] text-muted-foreground">Minha conta</span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem asChild>
                  <Link to="/app/perfil" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" /> Meu perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/app/perfil" className="cursor-pointer">
                    <Building2 className="mr-2 h-4 w-4" /> Minha empresa
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/app/perfil" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" /> Configurações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/central-de-ajuda" className="cursor-pointer">
                    <HelpCircle className="mr-2 h-4 w-4" /> Central de ajuda
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void handleSignOut()} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Sidebar desktop */}
      <aside className="fixed bottom-0 left-0 top-16 z-30 hidden w-60 flex-col border-r border-border bg-card lg:flex">
        <SidebarNav pathname={pathname} onNavigate={() => setMobileMenu(false)} />
      </aside>

      {/* Sidebar mobile */}
      {mobileMenu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-forest/40" onClick={() => setMobileMenu(false)} />
          <div className="absolute bottom-0 left-0 top-0 flex w-72 flex-col bg-card shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <span className="font-display text-base font-bold text-forest">
                DDP <span className="text-accent">AGRO</span>
              </span>
              <button
                className="rounded-md p-2 text-forest hover:bg-secondary"
                onClick={() => setMobileMenu(false)}
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submitSearch} className="border-b border-border p-3 md:hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar máquinas..."
                  className="h-10 w-full rounded-md border border-border bg-secondary/60 pl-9 pr-4 text-sm outline-none focus:border-accent"
                />
              </div>
            </form>
            <SidebarNav pathname={pathname} onNavigate={() => setMobileMenu(false)} />
          </div>
        </div>
      )}

      {/* Conteúdo */}
      <main className="pb-24 pt-16 lg:pb-10 lg:pl-60">
        <Outlet />
      </main>

      {/* Bottom nav mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-card lg:hidden">
        {BOTTOM_NAV.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          if (item.highlight) {
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex flex-1 flex-col items-center justify-center py-2"
                aria-label={item.label}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md">
                  <item.icon className="h-5 w-5" />
                </span>
                <span className="mt-0.5 text-[10px] font-semibold text-forest">{item.label}</span>
              </Link>
            );
          }
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-2",
                active ? "text-forest" : "text-muted-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  return (
    <>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-secondary text-forest"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-forest",
                      )}
                    >
                      <item.icon className={cn("h-4 w-4", active ? "text-accent" : "")} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-border px-5 py-4">
        <p className="font-display text-xs font-bold text-forest">DDP AGRO</p>
        <p className="text-[11px] text-muted-foreground">Marketplace fechado</p>
        <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-green-600" /> Sistema operacional
        </p>
      </div>
    </>
  );
}

export function AppPage({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</div>;
}

export { ClipboardList };
