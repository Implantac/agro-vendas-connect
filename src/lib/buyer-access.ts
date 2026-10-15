/**
 * Acesso do comprador: gratuito (navegar, favoritar e propor sem assinatura).
 * Só o vendedor paga membresia. Funções puras, sem I/O, para teste unitário.
 *
 * O comprador continua passando pela análise do admin (cadastro verificado), mas sem
 * cobrança. A aprovação usa o fluxo que já existe: admin muda o status em Membros.
 */

export type PlanLike = { target_role: string };

/** Só vendedor paga membresia. Comprador e admin não passam por cobrança. */
export function requiresMembershipPayment(role: string | null | undefined): boolean {
  return role === "seller";
}

/** Destino logo após o cadastro. */
export function postSignupDestination(
  role: "buyer" | "seller",
): { to: "/aguardando-aprovacao" } | { to: "/membresia" } {
  return requiresMembershipPayment(role) ? { to: "/membresia" } : { to: "/aguardando-aprovacao" };
}

/**
 * Planos mostrados ao público e na escolha de membresia. Planos de comprador ficam fora da
 * tela (a linha no banco não é alterada). Planos sem papel reconhecido também saem.
 */
export function offeredPlans<T extends PlanLike>(plans: readonly T[]): T[] {
  return plans.filter((p) => p.target_role === "seller");
}
