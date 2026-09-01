import {
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  Handshake,
  Heart,
  Home,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Tag,
  User,
} from "lucide-react";

export type AppMode = "comprador" | "vendedor";

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
  | "/app/empresa";

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

/** Rotas exclusivas do modo vendedor (guards). */
export const SELLER_ONLY_ROUTES: AppRoute[] = [
  "/app/meus-anuncios",
  "/app/publicar",
  "/app/propostas-recebidas",
  "/app/desempenho",
  "/app/empresa",
];

export const NAV_BY_ROLE: Record<AppMode, NavGroup[]> = {
  comprador: [
    {
      label: "Início",
      items: [{ to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true }],
    },
    {
      label: "Buscar",
      items: [
        { to: "/app/comprar", label: "Comprar máquinas", icon: Search },
        { to: "/app/favoritos", label: "Favoritos", icon: Heart },
      ],
    },
    {
      label: "Negócios",
      items: [
        { to: "/app/negociacoes", label: "Minhas negociações", icon: Handshake },
        { to: "/app/propostas", label: "Propostas enviadas", icon: Tag },
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
      label: "Início",
      items: [{ to: "/app", label: "Dashboard do vendedor", icon: LayoutDashboard, exact: true }],
    },
    {
      label: "Vendas",
      items: [
        { to: "/app/publicar", label: "Publicar anúncio", icon: Plus, variant: "primary" },
        { to: "/app/meus-anuncios", label: "Meus anúncios", icon: ClipboardList },
        { to: "/app/propostas-recebidas", label: "Propostas recebidas", icon: Inbox },
        { to: "/app/desempenho", label: "Desempenho dos anúncios", icon: BarChart3 },
      ],
    },
    {
      label: "Negociação",
      items: [
        { to: "/app/negociacoes", label: "Negociações", icon: Handshake },
        { to: "/app/mensagens", label: "Mensagens", icon: MessageSquare },
        { to: "/app/notificacoes", label: "Notificações", icon: Bell, badgeKey: "notifications" },
      ],
    },
    {
      label: "Conta",
      items: [
        { to: "/app/perfil", label: "Meu perfil", icon: User },
        { to: "/app/empresa", label: "Minha empresa", icon: Building2 },
        { to: "/app/configuracoes", label: "Configurações", icon: Settings },
      ],
    },
  ],
};

export const BOTTOM_NAV_BY_ROLE: Record<AppMode, NavItem[]> = {
  comprador: [
    { to: "/app", label: "Início", icon: Home, exact: true },
    { to: "/app/comprar", label: "Buscar", icon: Search },
    { to: "/app/favoritos", label: "Favoritos", icon: Heart },
    { to: "/app/mensagens", label: "Mensagens", icon: MessageSquare },
    { to: "/app/perfil", label: "Perfil", icon: User },
  ],
  vendedor: [
    { to: "/app", label: "Início", icon: Home, exact: true },
    { to: "/app/meus-anuncios", label: "Anúncios", icon: ClipboardList },
    { to: "/app/publicar", label: "Vender", icon: Plus, variant: "primary" },
    { to: "/app/propostas-recebidas", label: "Propostas", icon: Inbox },
    { to: "/app/perfil", label: "Perfil", icon: User },
  ],
};

export const DEFAULT_ROUTE_BY_MODE: Record<AppMode, AppRoute> = {
  comprador: "/app/comprar",
  vendedor: "/app/meus-anuncios",
};
