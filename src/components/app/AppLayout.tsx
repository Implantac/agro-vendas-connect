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
  ADMIN_ONLY_ROUTES,
  BOTTOM_NAV_BY_ROLE,
  BUYER_ONLY_ROUTES,
  HOME_ROUTE_BY_MODE,
  MODE_LABEL,
  NAV_BY_ROLE,
  SELLER_ONLY_ROUTES,
  type NavGroup,
} from "@/config/navigation";
import { fetchUnreadNotificationsCount } from "@/lib/app-queries";
import { BuyerFilterPanel } from "@/components/app/BuyerFilterPanel";
import { useCatalogFilters } from "@/features/catalog/useCatalogFilters";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const { user, profile, loading, signOut } = useAuth();
  const { mode, ready } = useAppRole();
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

  // Membresia: somente membros aprovados acessam a área logada.
  const memberStatus = profile?.status;
  useEffect(() => {
    if (loading || !user || !memberStatus || memberStatus === "approved") return;
    void navigate({
      to: memberStatus === "pending" ? "/aguardando-aprovacao" : "/cadastro-rejeitado",
      replace: true,
    });
  }, [loading, user, memberStatus, navigate]);

  const isSellerOnlyRoute = SELLER_ONLY_ROUTES.some((route) => pathname.startsWith(route));
  const isAdminOnlyRoute = ADMIN_ONLY_ROUTES.some((route) => pathname.startsWith(route));
  const isBuyerOnlyRoute = BUYER_ONLY_ROUTES.some((route) => pathname.startsWith(route));

  useEffect(() => {
    if (!ready) return;
    const blocked =
      (mode !== "vendedor" && isSellerOnlyRoute) ||
      (mode !== "admin" && isAdminOnlyRoute) ||
      (mode !== "comprador" && isBuyerOnlyRoute);
    if (blocked) {
      toast.info("Esta área não pertence ao seu perfil de acesso.");
      void navigate({ to: HOME_ROUTE_BY_MODE[mode], replace: true });
      return;
    }
    // Admin entra direto no command center.
    if (mode === "admin" && pathname === "/app") {
      void navigate({ to: "/app/admin", replace: true });
    }
  }, [ready, mode, isSellerOnlyRoute, isAdminOnlyRoute, isBuyerOnlyRoute, pathname, navigate]);

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
  const showSearch = true;
  const searchTarget = mode === "admin" ? "/app/admin/anuncios" : "/app/comprar";
  const bottomNav = BOTTOM_NAV_BY_ROLE[mode];


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header id="app-header" data-app-header="true" className="fixed inset-x-0 top-0 z-40 h-16 shrink-0 border-b border-border bg-card">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <button
            className="rounded-md p-2 text-forest hover:bg-secondary lg:hidden"
            onClick={() => setMobileMenu(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/app" data-brand="header" className="flex items-center gap-2.5">
            <Logo variant="symbol" />
            <span className="leading-tight">
              <span className="block font-display text-base font-bold tracking-tight text-forest">
                DDP <span className="text-accent">AGRO</span>
              </span>
              <span className="hidden truncate text-[10px] font-semibold uppercase tracking-widest text-accent lg:block">
                Área de membros
              </span>
            </span>
          </Link>

          {showSearch && (
            <>
              <div className="mx-auto hidden w-full max-w-xl md:block">
                <HeaderSearch
                  value={filters.q ?? ""}
                  placeholder={mode === "admin" ? "Buscar anúncios para moderar" : "Buscar máquinas e implementos"}
                  onSearch={(q) => setFilters({ q: q || undefined })}
                />
              </div>
              <Button asChild variant="ghost" size="icon" className="ml-auto text-forest md:hidden" aria-label="Buscar">
                <Link to={searchTarget}>
                  <Search className="h-5 w-5" />
                </Link>
              </Button>
            </>
          )}



          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-forest md:inline-flex">
              {MODE_LABEL[mode]}
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
                {mode === "vendedor" && (
                  <DropdownMenuItem asChild>
                    <Link to="/app/empresa" className="cursor-pointer">
                      <Building2 className="mr-2 h-4 w-4" /> Minha empresa
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/app/configuracoes" className="cursor-pointer">
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
  return <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6">{children}</div>;
}

export { ClipboardList };

/** Busca do header: digita livremente e só navega ao parar de digitar (ou no Enter). */
function HeaderSearch({ value, onSearch }: { value: string; onSearch: (q: string) => void }) {
  const [term, setTerm] = useState(value);

  useEffect(() => setTerm(value), [value]);

  useEffect(() => {
    if (term === value) return;
    const id = setTimeout(() => onSearch(term), 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(term);
      }}
      className="relative"
    >
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Buscar máquinas, marcas, modelos..."
        aria-label="Buscar máquinas"
        className="h-10 w-full rounded-md border border-border bg-secondary/60 pl-9 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:bg-card"
      />
    </form>
  );
}
