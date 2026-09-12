import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "ddp-agro-install-prompt-dismissed";

function isAppleMobile() {
  const platform = navigator.platform ?? "";
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function InstallAppPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showAppleGuide, setShowAppleGuide] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const mobileOrTablet = window.matchMedia("(max-width: 1024px) and (pointer: coarse)").matches;
    if (!mobileOrTablet || isInstalled() || localStorage.getItem(DISMISSED_KEY)) {
      setVisible(false);
      return;
    }

    if (isAppleMobile()) {
      setShowAppleGuide(true);
      setVisible(true);
    }

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const handleInstalled = () => {
      setVisible(false);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "true");
    setVisible(false);
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setVisible(false);
    setInstallEvent(null);
  }

  if (!visible) return null;

  return (
    <aside
      aria-label="Instalar DDP AGRO"
      className="fixed inset-x-3 bottom-20 z-[60] mx-auto max-w-md rounded-md border border-border bg-card p-4 shadow-xl md:bottom-4 lg:hidden"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Fechar aviso de instalação"
        className="absolute right-2 top-2 h-8 w-8 text-muted-foreground"
        onClick={dismiss}
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="flex gap-3 pr-8">
        <img src="/pwa-192.png" alt="" className="h-12 w-12 rounded-md" />
        <div className="min-w-0">
          <p className="font-display text-base font-semibold text-forest">Instale a DDP AGRO</p>
          {showAppleGuide ? (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Toque em <Share className="mx-1 inline h-4 w-4 text-forest" aria-label="Compartilhar" />
              e depois em <strong className="font-semibold text-foreground">Adicionar à Tela de Início</strong>.
            </p>
          ) : installEvent ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Acesse a plataforma direto pela tela inicial do seu aparelho.
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Abra o menu do navegador e escolha <strong className="font-semibold text-foreground">Instalar aplicativo</strong>.
            </p>
          )}
        </div>
      </div>

      {installEvent && !showAppleGuide && (
        <Button type="button" className="mt-3 w-full" onClick={() => void install()}>
          <Download className="h-4 w-4" /> Instalar
        </Button>
      )}
    </aside>
  );
}