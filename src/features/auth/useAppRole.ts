import { useAuth } from "@/hooks/useAuth";
import type { AppMode } from "@/config/navigation";

/**
 * Experiência ativa do usuário — derivada exclusivamente do papel.
 * profiles.role: buyer -> comprador | seller -> vendedor | admin -> admin (shell próprio).
 * Não existe toggle "Comprar | Vender": cada papel tem seu shell.
 */
export function useAppRole() {
  const { profile, isAdmin } = useAuth();
  const role = profile?.role;
  // Admin mantém acesso irrestrito (isAdmin), mas pode alternar o próprio
  // perfil para comprador/vendedor a fim de testar as experiências.
  const mode: AppMode = role === "admin" ? "admin" : role === "seller" ? "vendedor" : "comprador";

  return {
    role,
    isAdmin,
    mode,
    /** false até o perfil carregar (evita guards prematuros). */
    ready: Boolean(role),
    isBuyer: mode === "comprador",
    isSeller: mode === "vendedor",
    isAdminShell: mode === "admin",
  };
}
