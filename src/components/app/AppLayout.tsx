import { type ReactNode, useEffect, useState } from "react";
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
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useAppRole } from "@/features/auth/useAppRole";
import {
  BOTTOM_NAV_BY_ROLE,
  DEFAULT_ROUTE_BY_MODE,
  NAV_BY_ROLE,
  SELLER_ONLY_ROUTES,
  type AppMode,
  type NavGroup,
  type NavItem,
} from "@/config/navigation";
import { fetchUnreadNotificationsCount } from "@/lib/app-queries";
import { BuyerFilterPanel } from "@/components/app/BuyerFilterPanel";
import { useCatalogFilters } from "@/features/catalog/useCatalogFilters";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const { user, profile, loading, signOut } = useAuth();
  const { mode, setMode, canSwitchRoles } = useAppRole();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileMenu, setMobileMenu] = useState(false);
  const { filters, setFilters } = useCatalogFilters();

  const { data: unread = 0 } = useQuery({
    queryKey: ["notifications", "unread", user?.id],
    queryFn: () => fetchUnreadNotificationsCount(user!.id),
    enabled: Boolean(user),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/entrar", search: { redirect: "/app" } });
  }, [loading, user, navigate]);

  const isSellerOnlyRoute = SELLER_ONLY_ROUTES.some((route) => pathname.startsWith(route));

  useEffect(() => {
    if (mode !== "vendedor" && isSellerOnlyRoute) {
      toast.info("Esta área é exclusiva do modo vendedor.");
      void navigate({ to: "/app", replace: true });
    }
  }, [mode, isSellerOnlyRoute, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando sua área...</p>
      </div>
    );
  }

  async function handleSignOut() {
    await signOut();
    void navigate({ to: "/", replace: true });
  }

  const firstName = profile?.full_name?.split(" ")[0] ?? "Membro";
  const navGroups = NAV_BY_ROLE[mode];
  const showFilters = mode === "comprador" && pathname.startsWith("/app/comprar");
  const bottomNav = BOTTOM_NAV_BY_ROLE[mode];

  function switchMode(next: AppMode) {
    if (next === mode) return;
    setMode(next);
    void navigate({ to: DEFAULT_ROUTE_BY_MODE[next] });
  }

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

          <div className="mx-auto hidden w-full max-w-xl md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={filters.q ?? ""}
                onChange={(e) => setFilters({ q: e.target.value || undefined })}
                placeholder="Buscar máquinas, marcas, modelos..."
                aria-label="Buscar máquinas"
                className="h-10 w-full rounded-md border border-border bg-secondary/60 pl-9 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:bg-card"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {canSwitchRoles ? (
              <div
                role="tablist"
                aria-label="Alternar modo"
                className="hidden items-center rounded-md border border-border bg-secondary/60 p-0.5 sm:flex"
              >
                {(["comprador", "vendedor"] as const).map((value) => (
                  <button
                    key={value}
                    role="tab"
                    aria-selected={mode === value}
                    onClick={() => switchMode(value)}
                    className={cn(
                      "rounded px-3 py-1 text-xs font-semibold transition-colors",
                      mode === value ? "bg-card text-forest shadow-sm" : "text-muted-foreground",
                    )}
                  >
                    {value === "comprador" ? "Comprar" : "Vender"}
                  </button>
                ))}
              </div>
            ) : null}
            <span className="hidden rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-forest md:inline-flex">
              {mode === "comprador" ? "Modo comprador" : "Modo vendedor"}
            </span>
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
      <aside className="fixed bottom-0 left-0 top-16 z-30 hidden w-60 flex-col overflow-y-auto border-r border-border bg-card lg:flex">
        <SidebarNav
          groups={navGroups}
          showFilters={showFilters}
          pathname={pathname}
          onNavigate={() => setMobileMenu(false)}
        />
      </aside>

      {/* Sidebar mobile */}
      {mobileMenu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-forest/40" onClick={() => setMobileMenu(false)} />
          <div className="absolute bottom-0 left-0 top-0 flex w-72 flex-col overflow-y-auto bg-card shadow-xl">
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
            <SidebarNav
              groups={navGroups}
              showFilters={showFilters}
              pathname={pathname}
              onNavigate={() => setMobileMenu(false)}
            />
          </div>
        </div>
      )}

      {/* Conteúdo */}
      <main className="pb-24 pt-16 lg:pb-10 lg:pl-60">
        <Outlet />
      </main>

      {/* Bottom nav mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-card lg:hidden">
        {bottomNav.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          if (item.variant === "primary") {
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

function SidebarNav({
  groups,
  showFilters,
  pathname,
  onNavigate,
}: {
  groups: NavGroup[];
  showFilters: boolean;
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <>
      <nav className={cn("space-y-5 px-3 py-5", showFilters ? "shrink-0" : "flex-1")}>
        {groups.map((group) => (
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
                        item.variant === "primary"
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : active
                            ? "bg-secondary text-forest"
                            : "text-muted-foreground hover:bg-secondary/60 hover:text-forest",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-4 w-4",
                          item.variant === "primary" ? "" : active ? "text-accent" : "",
                        )}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      {showFilters && (
        <section aria-label="Filtros do catálogo" className="overflow-y-auto border-t border-border">
          <BuyerFilterPanel onApplied={onNavigate} />
        </section>
      )}
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
