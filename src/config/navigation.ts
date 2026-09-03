import {
  BadgeCheck,
  BarChart3,
  Bell,
  ClipboardList,
  Flag,
  Handshake,
  Heart,
  Home,
  LayoutDashboard,
  MessageSquare,
  Package,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Store,
  Target,
  User,
  Users,
  Wallet,
} from "lucide-react";

/** Experiência ativa. Cada papel tem seu próprio shell — não há toggle global. */
export type AppMode = "comprador" | "vendedor" | "admin";

export type AppRoute =
  | "/app"
  | "/app/comprar"
  | "/app/favoritos"
  | "/app/negociacoes"
  | "/app/propostas"
  | "/app/pedidos"
  | "/app/mensagens"
  | "/app/notificacoes"
  | "/app/perfil"
  | "/app/configuracoes"
  | "/app/meus-anuncios"
  | "/app/publicar"
  | "/app/leads"
  | "/app/propostas-recebidas"
  | "/app/desempenho"
  | "/app/empresa"
  | "/app/admin"
  | "/app/admin/membros"
  | "/app/admin/membresias"
  | "/app/admin/anuncios"
  | "/app/admin/negociacoes"
  | "/app/admin/pedidos"
  | "/app/admin/denuncias"
  | "/app/admin/financeiro"
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
  "/app/leads",
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
      label: "Comprar",
      items: [
        { to: "/app", label: "Início", icon: Home, exact: true },
        { to: "/app/comprar", label: "Buscar máquinas", icon: Search },
        { to: "/app/favoritos", label: "Favoritos", icon: Heart },
      ],
    },
    {
      label: "Minhas negociações",
      items: [
        { to: "/app/negociacoes", label: "Negociações", icon: Handshake },
        { to: "/app/mensagens", label: "Mensagens", icon: MessageSquare },
        { to: "/app/pedidos", label: "Pedidos", icon: Package },
        { to: "/app/notificacoes", label: "Notificações", icon: Bell, badgeKey: "notifications" },
      ],
    },
    {
      label: "Conta",
      items: [{ to: "/app/perfil", label: "Perfil", icon: User }],
    },
  ],
  vendedor: [
    {
      label: "Vender",
      items: [
        { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
        { to: "/app/publicar", label: "Publicar anúncio", icon: Plus, variant: "primary" },
        { to: "/app/meus-anuncios", label: "Meus anúncios", icon: ClipboardList },
        { to: "/app/leads", label: "Leads/Interessados", icon: Target },
      ],
    },
    {
      label: "Pipeline",
      items: [
        { to: "/app/negociacoes", label: "Negociações", icon: Handshake },
        { to: "/app/mensagens", label: "Mensagens", icon: MessageSquare },
        { to: "/app/pedidos", label: "Pedidos", icon: Package },
        { to: "/app/desempenho", label: "Desempenho", icon: BarChart3 },
        { to: "/app/notificacoes", label: "Notificações", icon: Bell, badgeKey: "notifications" },
      ],
    },
    {
      label: "Conta",
      items: [{ to: "/app/perfil", label: "Perfil", icon: User }],
    },
  ],
  admin: [
    {
      label: "Operação",
      items: [
        { to: "/app/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
        { to: "/app/admin/membros", label: "Usuários", icon: Users },
        { to: "/app/admin/membresias", label: "Aprovações", icon: BadgeCheck },
        { to: "/app/admin/anuncios", label: "Anúncios", icon: ClipboardList },
      ],
    },
    {
      label: "Negócios",
      items: [
        { to: "/app/admin/negociacoes", label: "Negociações", icon: Handshake },
        { to: "/app/admin/pedidos", label: "Pedidos", icon: Package },
        { to: "/app/admin/financeiro", label: "Financeiro", icon: Wallet },
      ],
    },
    {
      label: "Confiança",
      items: [
        { to: "/app/admin/denuncias", label: "Denúncias", icon: Flag },
        { to: "/app/admin/auditoria", label: "Auditoria", icon: ShieldCheck },
        { to: "/app/configuracoes", label: "Configurações", icon: Settings },
      ],
    },
  ],
};

export const BOTTOM_NAV_BY_ROLE: Record<AppMode, NavItem[]> = {
  comprador: [
    { to: "/app/comprar", label: "Buscar", icon: Search },
    { to: "/app/favoritos", label: "Favoritos", icon: Heart },
    { to: "/app/negociacoes", label: "Negócios", icon: Handshake },
    { to: "/app/mensagens", label: "Mensagens", icon: MessageSquare },
    { to: "/app/perfil", label: "Perfil", icon: User },
  ],
  vendedor: [
    { to: "/app", label: "Painel", icon: Home, exact: true },
    { to: "/app/meus-anuncios", label: "Anúncios", icon: ClipboardList },
    { to: "/app/publicar", label: "Publicar", icon: Plus, variant: "primary" },
    { to: "/app/leads", label: "Leads", icon: Target },
    { to: "/app/perfil", label: "Perfil", icon: User },
  ],
  admin: [
    { to: "/app/admin", label: "Painel", icon: Home, exact: true },
    { to: "/app/admin/membros", label: "Usuários", icon: Users },
    { to: "/app/admin/anuncios", label: "Anúncios", icon: ClipboardList },
    { to: "/app/admin/denuncias", label: "Denúncias", icon: Flag },
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

/** Admin no command center: atalhos para as telas de comprador e vendedor. */
export const ADMIN_VIEWS_GROUP: NavGroup[] = [
  {
    label: "Ver como",
    items: [
      { to: "/app/comprar", label: "Área do comprador", icon: Search },
      { to: "/app/meus-anuncios", label: "Área do vendedor", icon: Store },
    ],
  },
];

/** Admin dentro das telas de comprador/vendedor: volta ao command center. */
export const ADMIN_BACK_GROUP: NavGroup[] = [
  {
    label: "Administração",
    items: [{ to: "/app/admin", label: "Voltar ao command center", icon: ShieldCheck }],
  },
];
