import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Building2, MapPin } from "lucide-react";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/empresa")({
  head: () => ({
    meta: [
      { title: "Minha empresa | DDP AGRO" },
      { name: "description", content: "Perfil comercial exibido aos compradores da plataforma." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Empresa,
});

function Empresa() {
  const { user, profile } = useAuth();

  const { data: seller, isLoading } = useQuery({
    queryKey: ["seller-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("seller_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: Boolean(user),
  });

  return (
    <AppPage>
      <h1 className="text-2xl font-bold tracking-tight text-forest">Minha empresa</h1>
      <p className="text-sm text-muted-foreground">
        Estas informações aparecem para compradores nos seus anúncios.
      </p>

      <div className="mt-6 rounded-lg border border-border bg-card p-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando dados da empresa...</p>
        ) : (
          <>
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-forest">
                <Building2 className="h-6 w-6" />
              </span>
              <div>
                <p className="text-base font-semibold text-forest">
                  {seller?.trade_name ?? profile?.full_name ?? "Empresa não cadastrada"}
                </p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {profile?.city && profile?.state
                    ? `${profile.city}/${profile.state}`
                    : "Localização não informada"}
                </p>
                {seller?.verification_status === "approved" && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-green-700">
                    <BadgeCheck className="h-4 w-4" /> Vendedor aprovado
                  </p>
                )}
              </div>
            </div>

            <p className="mt-5 text-sm text-muted-foreground">
              {seller?.company_description ??
                "Adicione uma descrição da sua empresa para gerar mais confiança nas negociações."}
            </p>

            <Button asChild variant="outline" size="sm" className="mt-5">
              <Link to="/app/perfil">Atualizar dados cadastrais</Link>
            </Button>
          </>
        )}
      </div>
    </AppPage>
  );
}
