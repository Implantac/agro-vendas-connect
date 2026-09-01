import { Link } from "@tanstack/react-router";
import { Lock, ShieldCheck, MessageSquare, FileCheck2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";

const BENEFITS = [
  { icon: FileCheck2, text: "Ficha técnica completa e fotos de todos os implementos" },
  { icon: MessageSquare, text: "Propostas e chat direto com o vendedor aprovado" },
  { icon: ShieldCheck, text: "Negociação registrada e moderada pela plataforma" },
];

export function MembershipGateDialog({
  open,
  onOpenChange,
  listingTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingTitle?: string;
}) {
  const { user, profile } = useAuth();
  const isPending = Boolean(user) && profile?.status !== "approved";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
            <Lock className="h-5 w-5 text-forest" />
          </div>
          <DialogTitle className="font-display text-xl text-forest">
            {isPending ? "Cadastro em análise" : "Conteúdo exclusivo para membros"}
          </DialogTitle>
          <DialogDescription>
            {isPending
              ? "Assim que sua adesão for aprovada você terá acesso aos produtos e poderá interagir com os vendedores."
              : `Para acessar ${listingTitle ? `“${listingTitle}”` : "os produtos"} e negociar com o vendedor, contrate o serviço e torne-se membro do DDP AGRO.`}
          </DialogDescription>
        </DialogHeader>

        {!isPending && (
          <ul className="space-y-3 py-1">
            {BENEFITS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-muted-foreground">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                {text}
              </li>
            ))}
          </ul>
        )}

        {isPending ? (
          <Button className="w-full bg-forest hover:bg-forest/90" onClick={() => onOpenChange(false)}>
            Entendi
          </Button>
        ) : (
          <div className="space-y-3">
            <Button asChild className="w-full bg-forest hover:bg-forest/90">
              <Link to="/cadastro">Quero ser membro</Link>
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Já é membro?{" "}
              <Link to="/entrar" className="font-medium text-forest underline">
                Entrar
              </Link>
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
