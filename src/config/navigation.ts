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
  Tractor,
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
  | "/app/comparar"
  | "/app/negociacoes"
  | "/app/pedidos"
  | "/app/mensagens"
  | "/app/notificacoes"
  | "/app/perfil"
  | "/app/configuracoes"
  | "/app/meus-anuncios"
  | "/app/maquinas"
  | "/app/publicar"
  | "/app/leads"
  | "/app/desempenho"
  | "/app/empresa"
  | "/app/admin"
  | "/app/admin/membros"
  | "/app/admin/aprovados"
  | "/app/admin/membresias"
  | "/app/admin/planos"
  | "/app/admin/anuncios"
  | "/app/admin/negociacoes"
  | "/app/admin/pedidos"
  | "/app/admin/denuncias"
  | "/app/admin/financeiro"
  | "/app/admin/auditoria"
  | "/app/admin/verificacoes"
  | "/app/admin/categorias"
  | "/app/admin/termos"
  | "/app/admin/privacidade";

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
  "/app/maquinas",
  "/app/publicar",
  "/app/leads",
  "/app/desempenho",
  "/app/empresa",
];

/** Rotas exclusivas do administrador. */
export const ADMIN_ONLY_ROUTES: AppRoute[] = ["/app/admin"];

/** Rotas exclusivas do comprador. */
export const BUYER_ONLY_ROUTES: AppRoute[] = ["/app/comprar", "/app/favoritos", "/app/comparar"];

export const NAV_BY_ROLE: Record<AppMode, NavGroup[]> = {
  comprador: [
    {
      label: "Comprar",
      items: [
        { to: "/app", label: "Início", icon: Home, exact: true },
        { to: "/app/comprar", label: "Buscar máquinas", icon: Search },
        { to: "/app/favoritos", label: "Favoritos e buscas salvas", icon: Heart },
        { to: "/app/comparar", label: "Comparar máquinas", icon: BarChart3 },
      ],
    },
    {
      label: "Minhas negociações",
      items: [
        { to: "/app/negociacoes", label: "Propostas e negociações", icon: Handshake },
        { to: "/app/mensagens", label: "Mensagens", icon: MessageSquare },
        { to: "/app/pedidos", label: "Pedidos", icon: Package },
        { to: "/app/notificacoes", label: "Notificações", icon: Bell, badgeKey: "notifications" },
      ],
    },
    {
      label: "Minha conta",
      items: [
        { to: "/app/perfil", label: "Perfil e documentos", icon: User },
        { to: "/app/configuracoes", label: "Conta e membresia", icon: Settings },
      ],
    },
  ],
  vendedor: [
    {
      label: "Meu estoque",
      items: [
        { to: "/app", label: "Início", icon: LayoutDashboard, exact: true },
        { to: "/app/publicar", label: "Publicar anúncio", icon: Plus, variant: "primary" },
        { to: "/app/maquinas", label: "Minhas máquinas", icon: Tractor },
        { to: "/app/meus-anuncios", label: "Meus anúncios", icon: ClipboardList },
      ],
    },
    {
      label: "Negociação",
      items: [
        { to: "/app/negociacoes", label: "Propostas recebidas", icon: Handshake },
        { to: "/app/leads", label: "Interessados", icon: Target },
        { to: "/app/mensagens", label: "Mensagens", icon: MessageSquare },
        { to: "/app/pedidos", label: "Pedidos", icon: Package },
        { to: "/app/notificacoes", label: "Notificações", icon: Bell, badgeKey: "notifications" },
      ],
    },
    {
      label: "Gestão",
      items: [
        { to: "/app/desempenho", label: "Desempenho", icon: BarChart3 },
        { to: "/app/empresa", label: "Empresa e documentos", icon: Store },
        { to: "/app/perfil", label: "Perfil", icon: User },
        { to: "/app/configuracoes", label: "Conta e membresia", icon: Settings },
      ],
    },
  ],
  admin: [
    {
      label: "Operação",
      items: [
        { to: "/app/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
        { to: "/app/admin/membros", label: "Usuários", icon: Users },
        { to: "/app/admin/membresias", label: "Aprovações", icon: BadgeCheck },
        { to: "/app/admin/aprovados", label: "Membros aprovados", icon: Users },
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
        { to: "/app/admin/verificacoes", label: "Verificação de documentos", icon: BadgeCheck },
        { to: "/app/admin/denuncias", label: "Denúncias", icon: Flag },
        { to: "/app/admin/auditoria", label: "Auditoria", icon: ShieldCheck },
        { to: "/app/admin/privacidade", label: "Privacidade (LGPD)", icon: ShieldCheck },
      ],
    },
    {
      label: "Conteúdo",
      items: [
        { to: "/app/admin/planos", label: "Planos de membresia", icon: Wallet },
        { to: "/app/admin/categorias", label: "Categorias", icon: ClipboardList },
        { to: "/app/admin/termos", label: "Termos e versões", icon: ClipboardList },
        { to: "/app/configuracoes", label: "Configurações", icon: Settings },
      ],
    },
  ],
};

export const BOTTOM_NAV_BY_ROLE: Record<AppMode, NavItem[]> = {
  comprador: [
    { to: "/app", label: "Início", icon: Home, exact: true },
    { to: "/app/comprar", label: "Comprar", icon: Search },
    { to: "/app/negociacoes", label: "Negociações", icon: Handshake },
    { to: "/app/mensagens", label: "Mensagens", icon: MessageSquare },
    { to: "/app/perfil", label: "Conta", icon: User },
  ],
  vendedor: [
    { to: "/app", label: "Início", icon: Home, exact: true },
    { to: "/app/maquinas", label: "Máquinas", icon: Tractor },
    { to: "/app/negociacoes", label: "Propostas", icon: Handshake },
    { to: "/app/mensagens", label: "Mensagens", icon: MessageSquare },
    { to: "/app/perfil", label: "Conta", icon: User },
  ],
  admin: [
    { to: "/app/admin", label: "Painel", icon: Home, exact: true },
    { to: "/app/admin/anuncios", label: "Pendências", icon: ClipboardList },
    { to: "/app/admin/membros", label: "Operação", icon: Users },
    { to: "/app/admin/denuncias", label: "Alertas", icon: Flag },
    { to: "/app/perfil", label: "Mais", icon: User },
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
