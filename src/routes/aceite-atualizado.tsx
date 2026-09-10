import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { LEGAL_DOC_ROUTE, acceptLegalDocs, fetchPendingLegalDocs } from "@/lib/legal";

export const Route = createFileRoute("/aceite-atualizado")({
  head: () => ({
    meta: [
      { title: "Atualização dos termos | DDP AGRO" },
      {
        name: "description",
        content:
          "Revise e aceite a nova versão dos termos, da política de privacidade e do termo de ciência de riscos do DDP AGRO para continuar usando a plataforma.",
      },
      { property: "og:type", content: "article" },
      { property: "og:title", content: "Atualização dos termos | DDP AGRO" },
      {
        property: "og:description",
        content: "Aceite a nova versão dos documentos obrigatórios para continuar no DDP AGRO.",
      },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AcceptUpdatedTerms,
});

function AcceptUpdatedTerms() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/entrar", search: { redirect: "/app" } });
  }, [loading, user, navigate]);

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ["legal", "pending", user?.id],
    queryFn: () => fetchPendingLegalDocs(user!.id),
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!isLoading && user && pending.length === 0) void navigate({ to: "/app", replace: true });
  }, [isLoading, user, pending.length, navigate]);

  async function handleAccept() {
    if (!user) return;
    setSaving(true);
    try {
      await acceptLegalDocs(
        user.id,
        pending.map((d) => d.id),
      );
      await queryClient.invalidateQueries({ queryKey: ["legal", "pending", user.id] });
      toast.success("Aceite registrado. Bom negócio!");
      void navigate({ to: "/app", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar o aceite.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PublicLayout>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
          Documentos atualizados
        </p>
        <h1 className="mt-4 font-display text-3xl font-bold text-forest">
          Precisamos do seu aceite para continuar
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Publicamos uma nova versão dos documentos abaixo. Leia com atenção e confirme o aceite
          para voltar a usar a plataforma.
        </p>

        <div className="mt-8 space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando documentos...</p>}
          {pending.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-5 py-4"
            >
              <div>
                <p className="font-medium text-forest">{doc.title}</p>
                <p className="text-xs text-muted-foreground">Versão {doc.version}</p>
              </div>
              {LEGAL_DOC_ROUTE[doc.doc_type] && (
                <Button asChild variant="outline" size="sm">
                  <a
                    href={LEGAL_DOC_ROUTE[doc.doc_type]}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ler documento
                  </a>
                </Button>
              )}
            </div>
          ))}
        </div>

        <label className="mt-8 flex cursor-pointer items-start gap-3 text-sm text-muted-foreground">
          <Checkbox
            checked={checked}
            onCheckedChange={(v) => setChecked(v === true)}
            className="mt-0.5"
          />
          <span>
            Li e aceito as novas versões dos documentos acima, incluindo a ciência de riscos das
            negociações realizadas entre membros.
          </span>
        </label>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            onClick={() => void handleAccept()}
            disabled={!checked || saving || pending.length === 0}
            size="lg"
          >
            {saving ? "Registrando..." : "Aceitar e continuar"}
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/">Voltar ao início</Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}
