import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Building2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface CompanyForm {
  legal_name: string;
  trade_name: string;
  company_description: string;
  website: string;
}

const EMPTY: CompanyForm = {
  legal_name: "",
  trade_name: "",
  company_description: "",
  website: "",
};

function Empresa() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CompanyForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  const { data: seller, isLoading } = useQuery({
    queryKey: ["seller-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (seller) {
      setForm({
        legal_name: seller.legal_name ?? "",
        trade_name: seller.trade_name ?? "",
        company_description: seller.company_description ?? "",
        website: seller.website ?? "",
      });
    } else if (profile) {
      setForm((f) => (f.trade_name ? f : { ...f, trade_name: profile.full_name }));
    }
  }, [seller, profile]);

  const set = <K extends keyof CompanyForm>(key: K, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function save() {
    if (!user) return;
    if (!form.trade_name.trim()) {
      toast.error("Informe o nome fantasia.");
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      legal_name: form.legal_name.trim() || form.trade_name.trim(),
      trade_name: form.trade_name.trim(),
      company_description: form.company_description.trim() || null,
      website: form.website.trim() || null,
    };
    const { error } = seller
      ? await supabase.from("seller_profiles").update(payload).eq("id", seller.id)
      : await supabase.from("seller_profiles").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar os dados da empresa.");
      return;
    }
    toast.success("Dados da empresa atualizados.");
    void queryClient.invalidateQueries({ queryKey: ["seller-profile"] });
  }

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
                  {form.trade_name || "Empresa não cadastrada"}
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

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="trade_name">Nome fantasia *</Label>
                <Input
                  id="trade_name"
                  value={form.trade_name}
                  onChange={(e) => set("trade_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legal_name">Razão social</Label>
                <Input
                  id="legal_name"
                  value={form.legal_name}
                  onChange={(e) => set("legal_name", e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="website">Site</Label>
                <Input
                  id="website"
                  value={form.website}
                  onChange={(e) => set("website", e.target.value)}
                  placeholder="https://"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="company_description">Descrição da empresa</Label>
                <Textarea
                  id="company_description"
                  rows={4}
                  value={form.company_description}
                  onChange={(e) => set("company_description", e.target.value)}
                  placeholder="Conte sobre sua operação, tempo de mercado e diferenciais."
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? "Salvando..." : "Salvar dados da empresa"}
              </Button>
              <Button asChild variant="outline">
                <Link to="/app/perfil">Atualizar dados cadastrais</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </AppPage>
  );
}
