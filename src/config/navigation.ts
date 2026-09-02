import {
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  Compass,
  Handshake,
  Heart,
  Home,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Store,
  Tag,
  User,
  Users,
} from "lucide-react";

/** Experiência ativa. Cada papel tem seu próprio shell — não há toggle global. */
export type AppMode = "comprador" | "vendedor" | "admin";

export type AppRoute =
  | "/app"
  | "/app/comprar"
  | "/app/favoritos"
  | "/app/negociacoes"
  | "/app/propostas"
  | "/app/mensagens"
  | "/app/notificacoes"
  | "/app/perfil"
  | "/app/configuracoes"
  | "/app/meus-anuncios"
  | "/app/publicar"
  | "/app/propostas-recebidas"
  | "/app/desempenho"
  | "/app/empresa"
  | "/app/admin"
  | "/app/admin/membros"
  | "/app/admin/anuncios"
  | "/app/admin/auditoria";

export interface NavItem {
  to: AppRoute;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  variant?: "primary";
  badgeKey?: "notifications";
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Rotas exclusivas do vendedor. */
export const SELLER_ONLY_ROUTES: AppRoute[] = [
  "/app/meus-anuncios",
  "/app/publicar",
  "/app/propostas-recebidas",
  "/app/desempenho",
  "/app/empresa",
];

/** Rotas exclusivas do administrador. */
export const ADMIN_ONLY_ROUTES: AppRoute[] = ["/app/admin"];

/** Rotas exclusivas do comprador. */
export const BUYER_ONLY_ROUTES: AppRoute[] = ["/app/comprar", "/app/favoritos"];

export const NAV_BY_ROLE: Record<AppMode, NavGroup[]> = {
  comprador: [
    {
      label: "Explorar",
      items: [
        { to: "/app", label: "Explorar", icon: Compass, exact: true },
        { to: "/app/comprar", label: "Buscar implementos", icon: Search },
        { to: "/app/favoritos", label: "Favoritos", icon: Heart },
      ],
    },
    {
      label: "Negociações",
      items: [
        { to: "/app/negociacoes", label: "Negociações", icon: Handshake },
        { to: "/app/propostas", label: "Propostas", icon: Tag },
        { to: "/app/mensagens", label: "Mensagens", icon: MessageSquare },
        { to: "/app/notificacoes", label: "Notificações", icon: Bell, badgeKey: "notifications" },
      ],
    },
    {
      label: "Conta",
      items: [
        { to: "/app/perfil", label: "Meu perfil", icon: User },
        { to: "/app/configuracoes", label: "Configurações", icon: Settings },
      ],
    },
  ],
  vendedor: [
    {
      label: "Central",
      items: [{ to: "/app", label: "Central de vendas", icon: Store, exact: true }],
    },
    {
      label: "Anúncios",
      items: [
        { to: "/app/publicar", label: "Publicar anúncio", icon: Plus, variant: "primary" },
        { to: "/app/meus-anuncios", label: "Meus anúncios", icon: ClipboardList },
      ],
    },
    {
      label: "Negociações",
      items: [
        { to: "/app/propostas-recebidas", label: "Propostas", icon: Inbox },
        { to: "/app/negociacoes", label: "Negociações", icon: Handshake },
        { to: "/app/mensagens", label: "Mensagens", icon: MessageSquare },
        { to: "/app/notificacoes", label: "Notificações", icon: Bell, badgeKey: "notifications" },
      ],
    },
    {
      label: "Desempenho",
      items: [{ to: "/app/desempenho", label: "Desempenho", icon: BarChart3 }],
    },
    {
      label: "Conta",
      items: [
        { to: "/app/empresa", label: "Minha empresa", icon: Building2 },
        { to: "/app/perfil", label: "Meu perfil", icon: User },
        { to: "/app/configuracoes", label: "Configurações", icon: Settings },
      ],
    },
  ],
  admin: [
    {
      label: "Command center",
      items: [{ to: "/app/admin", label: "Visão geral", icon: LayoutDashboard, exact: true }],
    },
    {
      label: "Plataforma",
      items: [
        { to: "/app/admin/membros", label: "Membros", icon: Users },
        { to: "/app/admin/anuncios", label: "Anúncios", icon: ClipboardList },
      ],
    },
    {
      label: "Segurança",
      items: [{ to: "/app/admin/auditoria", label: "Auditoria", icon: ShieldCheck }],
    },
    {
      label: "Configuração",
      items: [
        { to: "/app/perfil", label: "Meu perfil", icon: User },
        { to: "/app/configuracoes", label: "Configurações", icon: Settings },
      ],
    },
  ],
};

export const BOTTOM_NAV_BY_ROLE: Record<AppMode, NavItem[]> = {
  comprador: [
    { to: "/app", label: "Explorar", icon: Home, exact: true },
    { to: "/app/comprar", label: "Buscar", icon: Search },
    { to: "/app/favoritos", label: "Favoritos", icon: Heart },
    { to: "/app/mensagens", label: "Mensagens", icon: MessageSquare },
    { to: "/app/perfil", label: "Perfil", icon: User },
  ],
  vendedor: [
    { to: "/app", label: "Central", icon: Home, exact: true },
    { to: "/app/meus-anuncios", label: "Anúncios", icon: ClipboardList },
    { to: "/app/publicar", label: "Publicar", icon: Plus, variant: "primary" },
    { to: "/app/propostas-recebidas", label: "Propostas", icon: Inbox },
    { to: "/app/perfil", label: "Perfil", icon: User },
  ],
  admin: [
    { to: "/app/admin", label: "Overview", icon: Home, exact: true },
    { to: "/app/admin/membros", label: "Membros", icon: Users },
    { to: "/app/admin/anuncios", label: "Anúncios", icon: ClipboardList },
    { to: "/app/admin/auditoria", label: "Auditoria", icon: ShieldCheck },
    { to: "/app/perfil", label: "Perfil", icon: User },
  ],
};

export const HOME_ROUTE_BY_MODE: Record<AppMode, AppRoute> = {
  comprador: "/app",
  vendedor: "/app",
  admin: "/app/admin",
};

export const MODE_LABEL: Record<AppMode, string> = {
  comprador: "Comprador",
  vendedor: "Vendedor",
  admin: "Administrador",
};
