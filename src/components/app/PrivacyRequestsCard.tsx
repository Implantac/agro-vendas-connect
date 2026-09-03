import { useState } from "react";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type RequestType = "export" | "deletion";

/** LGPD: o titular solicita exportação ou exclusão dos seus dados. */
export function PrivacyRequestsCard() {
  const { user, profile } = useAuth();
  const [details, setDetails] = useState("");
  const [pending, setPending] = useState<RequestType | null>(null);

  async function submit(type: RequestType) {
    if (!user) return;
    if (details.length > 1000) {
      toast.error("A descrição deve ter no máximo 1000 caracteres");
      return;
    }
    setPending(type);
    const { error } = await supabase.from("privacy_requests").insert({
      user_id: user.id,
      email: profile?.email ?? user.email ?? "",
      request_type: type,
      details: details.trim() || null,
    });
    setPending(null);
    if (error) {
      toast.error("Não foi possível registrar a solicitação", { description: error.message });
      return;
    }
    setDetails("");
    toast.success(
      type === "export"
        ? "Solicitação de exportação registrada"
        : "Solicitação de exclusão registrada",
      { description: "Nossa equipe responderá pelos canais oficiais da DDP AGRO." },
    );
  }

  return (
    <div className="mt-8 rounded-lg border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-forest">Seus dados (LGPD)</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Você pode solicitar uma cópia dos seus dados pessoais ou pedir a exclusão da conta. A
        exclusão pode ser limitada por obrigações legais de guarda de registros.
      </p>

      <Textarea
        className="mt-4"
        rows={3}
        maxLength={1000}
        placeholder="Detalhe sua solicitação (opcional)"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={pending !== null}
          onClick={() => void submit("export")}
        >
          <Download className="mr-2 h-4 w-4" />
          Solicitar exportação
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={pending !== null}
          onClick={() => {
            if (window.confirm("Confirmar solicitação de exclusão da sua conta e dados?"))
              void submit("deletion");
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Solicitar exclusão da conta
        </Button>
      </div>
    </div>
  );
}
