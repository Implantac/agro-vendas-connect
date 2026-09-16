import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { AppMode } from "@/config/navigation";

const STORAGE_KEY = "ddp:app-mode";
const EVENT = "ddp:app-mode-change";

function read(): AppMode | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "comprador" || value === "vendedor" || value === "admin" ? value : null;
}

function subscribe(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Grava o modo escolhido e avisa todas as telas abertas. */
export function setAppMode(mode: AppMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, mode);
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Experiência ativa do usuário.
 * Todo membro aprovado pode comprar E vender: o modo é uma escolha ("Quero comprar"
 * / "Quero vender") guardada no aparelho, com o papel do cadastro apenas como padrão.
 * O shell de administração continua restrito a administradores reais (user_roles).
 */
export function useAppRole() {
  const { profile, isAdmin } = useAuth();
  const role = profile?.role;
  const stored = useSyncExternalStore(
    subscribe,
    read,
    () => null as AppMode | null,
  );

  const defaultMode: AppMode =
    role === "admin" && isAdmin ? "admin" : role === "seller" ? "vendedor" : "comprador";

  // Modo guardado só vale se ainda for permitido (admin exige privilégio real).
  const mode: AppMode = stored
    ? stored === "admin" && !isAdmin
      ? defaultMode
      : stored
    : defaultMode;

  useEffect(() => {
    if (stored === "admin" && !isAdmin) setAppMode(defaultMode);
  }, [stored, isAdmin, defaultMode]);

  const setMode = useCallback(
    (next: AppMode) => {
      if (next === "admin" && !isAdmin) return;
      setAppMode(next);
    },
    [isAdmin],
  );

  return {
    role,
    isAdmin,
    mode,
    setMode,
    /** false até o perfil carregar (evita guards prematuros). */
    ready: Boolean(role),
    isBuyer: mode === "comprador",
    isSeller: mode === "vendedor",
    isAdminShell: mode === "admin",
  };
}
