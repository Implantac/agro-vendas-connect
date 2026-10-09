import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function ProposalDialog({
  listingId,
  listingTitle,
  suggestedAmount,
}: {
  listingId: string;
  listingTitle: string;
  suggestedAmount: number | null;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(suggestedAmount ? String(suggestedAmount) : "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!user) return;
    const value = Number(amount.replace(/\./g, "").replace(",", "."));
    if (!value || value <= 0) {
      toast.error("Informe um valor válido para a proposta.");
      return;
    }
    setSaving(true);
    // Proposta, evento, conversa e mensagem são gravados numa única transação
    // no banco (RPC create_proposal). Falha em qualquer etapa desfaz tudo.
    const { data, error } = await supabase.rpc("create_proposal", {
      _listing_id: listingId,
      _amount: value,
      _message: message.trim() || null,
    });

    const proposalId =
      data && typeof data === "object" && "proposal_id" in data
        ? String((data as { proposal_id: unknown }).proposal_id)
        : null;

    if (error || !proposalId) {
      setSaving(false);
      toast.error("Não foi possível enviar a proposta.", {
        description: error?.message ?? "Tente novamente em instantes.",
      });
      return;
    }

    // A notificação ao vendedor é gerada automaticamente pelo banco de dados.

    setSaving(false);
    setOpen(false);
    setMessage("");
    toast.success("Proposta enviada", {
      description: "Acompanhe a negociação no seu painel.",
    });
    void navigate({ to: "/app/negociacao/$id", params: { id: proposalId } });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-forest hover:bg-forest/90">
          <Handshake className="mr-2 h-4 w-4" /> Enviar proposta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-forest">Enviar proposta</DialogTitle>
          <DialogDescription>
            Sua proposta é registrada na plataforma e enviada ao vendedor com histórico auditável.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="valor">Valor da proposta (R$)</Label>
            <Input
              id="valor"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="650000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mensagem">Mensagem ao vendedor</Label>
            <Textarea
              id="mensagem"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Condições de pagamento, prazo de retirada, dúvidas técnicas..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={saving}
            className="bg-forest hover:bg-forest/90"
          >
            {saving ? "Enviando..." : "Enviar proposta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
