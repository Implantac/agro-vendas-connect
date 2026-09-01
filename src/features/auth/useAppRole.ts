import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { AppMode } from "@/config/navigation";

const STORAGE_KEY = "ddp_agro:ui_mode";

function readStoredMode(): AppMode | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === "comprador" || raw === "vendedor" ? raw : null;
}

/**
 * Papel do usuário no app.
 * profiles.role: buyer -> comprador (papel único)
 *                seller -> vendedor (papel único)
 *                admin  -> ambos (pode alternar entre os modos)
 */
export function useAppRole() {
  const { profile } = useAuth();
  const role = profile?.role;
  const canSwitchRoles = role === "admin";
  const fixedMode: AppMode = role === "seller" ? "vendedor" : "comprador";

  const [storedMode, setStoredMode] = useState<AppMode | null>(null);

  useEffect(() => {
    setStoredMode(readStoredMode());
  }, []);

  const mode: AppMode = canSwitchRoles ? (storedMode ?? "comprador") : fixedMode;

  const setMode = useCallback(
    (next: AppMode) => {
      if (!canSwitchRoles) return;
      setStoredMode(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* fallback silencioso */
      }
    },
    [canSwitchRoles],
  );

  return {
    role,
    mode,
    setMode,
    canSwitchRoles,
    isBuyer: mode === "comprador",
    isSeller: mode === "vendedor",
  };
}
