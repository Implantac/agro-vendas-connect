import { useState } from "react";
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
  sellerId,
  listingTitle,
  suggestedAmount,
}: {
  listingId: string;
  sellerId: string;
  listingTitle: string;
  suggestedAmount: number | null;
}) {
  const { user } = useAuth();
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
    const { data: proposal, error } = await supabase
      .from("proposals")
      .insert({
        listing_id: listingId,
        buyer_id: user.id,
        seller_id: sellerId,
        amount: value,
        message: message || null,
        status: "open",
      })
      .select("id")
      .single();

    if (error || !proposal) {
      setSaving(false);
      toast.error("Não foi possível enviar a proposta.", { description: error?.message });
      return;
    }

    await supabase.from("proposal_events").insert({
      proposal_id: proposal.id,
      actor_id: user.id,
      event_type: "created",
      new_status: "open",
      message: message || null,
    });

    const { data: conversation } = await supabase
      .from("conversations")
      .insert({
        listing_id: listingId,
        proposal_id: proposal.id,
        buyer_id: user.id,
        seller_id: sellerId,
      })
      .select("id")
      .single();

    if (conversation && message) {
      await supabase.from("messages").insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        content: message,
      });
    }

    await supabase.from("notifications").insert({
      user_id: sellerId,
      type: "proposal_received",
      title: "Nova proposta recebida",
      message: `Você recebeu uma proposta para ${listingTitle}.`,
      action_url: "/app/propostas",
    });

    setSaving(false);
    setOpen(false);
    setMessage("");
    toast.success("Proposta enviada", {
      description: "Acompanhe a negociação no seu painel.",
    });
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
          <Button onClick={() => void submit()} disabled={saving} className="bg-forest hover:bg-forest/90">
            {saving ? "Enviando..." : "Enviar proposta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
