import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Send } from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { createListing, uploadListingPhotos } from "@/lib/listing-manage";
import { fetchCategories } from "@/lib/queries";
import { BRAZILIAN_STATES, CONDITION_LABELS, SALE_CONDITION_LABELS, formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/publicar")({
  head: () => ({
    meta: [
      { title: "Publicar anúncio | DDP AGRO" },
      { name: "description", content: "Anuncie sua máquina ou implemento agrícola." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Publicar,
});

const STEPS = ["Tipo", "Informações técnicas", "Preço", "Localização", "Revisão"];

interface Draft {
  categoryId: string;
  title: string;
  brand: string;
  model: string;
  year: string;
  condition: string;
  hours: string;
  description: string;
  price: string;
  priceOnRequest: boolean;
  city: string;
  state: string;
}

const INITIAL: Draft = {
  categoryId: "",
  title: "",
  brand: "",
  model: "",
  year: "",
  condition: "",
  hours: "",
  description: "",
  price: "",
  priceOnRequest: false,
  city: "",
  state: "",
};

function Publicar() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(INITIAL);
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  function canAdvance(): boolean {
    switch (step) {
      case 0:
        return Boolean(draft.categoryId && draft.title.trim());
      case 1:
        return Boolean(draft.condition);
      case 2:
        return draft.priceOnRequest || Number(draft.price) > 0;
      case 3:
        return Boolean(draft.state);
      default:
        return true;
    }
  }

  async function submit() {
    if (!user) return;
    setSubmitting(true);
    try {
      const created = await createListing(user.id, draft, "in_review");
      if (photos.length) await uploadListingPhotos(user.id, created.id, photos, 0);
    } catch {
      setSubmitting(false);
      toast.error("Não foi possível enviar o anúncio. Tente novamente.");
      return;
    }
    setSubmitting(false);
    toast.success("Anúncio enviado para análise! Avisaremos quando for aprovado.");
    void navigate({ to: "/app/meus-anuncios" });
  }

  if (profile && profile.status !== "approved") {
    return (
      <AppPage>
        <div className="mx-auto max-w-lg rounded-lg border border-border bg-card p-8 text-center">
          <h1 className="font-display text-xl font-bold text-forest">Conta em verificação</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Para publicar anúncios, seu cadastro precisa estar aprovado pela equipe DDP AGRO.
            Avisaremos assim que a análise for concluída.
          </p>
        </div>
      </AppPage>
    );
  }

  const categoryName = categories.find((c) => c.id === draft.categoryId)?.name;

  return (
    <AppPage>
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-2xl font-bold text-forest sm:text-3xl">Publicar anúncio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preencha as informações e envie para análise da equipe.
        </p>

        {/* Progresso */}
        <div className="mt-7 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 flex-col gap-1.5">
              <div
                className={cn(
                  "h-1.5 rounded-full transition-colors",
                  i <= step ? "bg-accent" : "bg-border",
                )}
              />
              <span
                className={cn(
                  "hidden text-[11px] font-medium sm:block",
                  i === step ? "text-accent" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-border bg-card p-6">
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="font-display text-lg font-semibold text-forest">
                O que você está anunciando?
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => set("categoryId", c.id)}
                    className={cn(
                      "rounded-lg border-2 p-4 text-sm font-semibold transition-all",
                      draft.categoryId === c.id
                        ? "border-accent bg-secondary text-forest"
                        : "border-border text-muted-foreground hover:border-accent/50",
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Título do anúncio *</Label>
                <Input
                  id="title"
                  value={draft.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Ex.: Trator John Deere 6120J 2022"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <h2 className="font-display text-lg font-semibold text-forest">
                Informações técnicas
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="brand">Marca</Label>
                  <Input
                    id="brand"
                    value={draft.brand}
                    onChange={(e) => set("brand", e.target.value)}
                    placeholder="Ex.: John Deere"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Modelo</Label>
                  <Input
                    id="model"
                    value={draft.model}
                    onChange={(e) => set("model", e.target.value)}
                    placeholder="Ex.: 6120J"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Ano de fabricação</Label>
                  <Input
                    id="year"
                    value={draft.year}
                    onChange={(e) => set("year", e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="Ex.: 2022"
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hours">Horas de uso</Label>
                  <Input
                    id="hours"
                    value={draft.hours}
                    onChange={(e) => set("hours", e.target.value.replace(/\D/g, ""))}
                    placeholder="Ex.: 1800"
                    inputMode="numeric"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Condição *</Label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(SALE_CONDITION_LABELS).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => set("condition", value)}
                      className={cn(
                        "rounded-lg border-2 p-3 text-sm font-semibold transition-all",
                        draft.condition === value
                          ? "border-accent bg-secondary text-forest"
                          : "border-border text-muted-foreground hover:border-accent/50",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={draft.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Descreva o estado geral, revisões, acessórios e diferenciais."
                  rows={5}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-display text-lg font-semibold text-forest">Preço</h2>
              <label className="flex items-center gap-2 text-sm text-forest">
                <input
                  type="checkbox"
                  checked={draft.priceOnRequest}
                  onChange={(e) => set("priceOnRequest", e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-[#2F80ED]"
                />
                Preço sob consulta
              </label>
              {!draft.priceOnRequest && (
                <div className="space-y-2">
                  <Label htmlFor="price">Valor (R$) *</Label>
                  <Input
                    id="price"
                    value={draft.price}
                    onChange={(e) => set("price", e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder="Ex.: 485000"
                    inputMode="decimal"
                  />
                  {Number(draft.price) > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Será exibido como <strong>{formatBRL(Number(draft.price))}</strong>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h2 className="font-display text-lg font-semibold text-forest">
                Onde a máquina está localizada?
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={draft.city}
                    onChange={(e) => set("city", e.target.value)}
                    placeholder="Ex.: Rio Verde"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estado *</Label>
                  <Select value={draft.state} onValueChange={(v) => set("state", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRAZILIAN_STATES.map((uf) => (
                        <SelectItem key={uf} value={uf}>
                          {uf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <h2 className="font-display text-lg font-semibold text-forest">Revise seu anúncio</h2>
              <div className="space-y-2">
                <Label htmlFor="photos">Fotos do implemento</Label>
                <Input
                  id="photos"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
                />
                <p className="text-xs text-muted-foreground">
                  {photos.length
                    ? `${photos.length} foto(s) selecionada(s). A primeira será a capa.`
                    : "Anúncios com fotos recebem mais propostas. Você também pode adicionar depois em Editar anúncio."}
                </p>
              </div>
              <dl className="space-y-3 rounded-lg bg-secondary/50 p-5 text-sm">
                {[
                  ["Categoria", categoryName ?? "—"],
                  ["Título", draft.title],
                  ["Marca / Modelo", [draft.brand, draft.model].filter(Boolean).join(" ") || "—"],
                  ["Ano", draft.year || "—"],
                  ["Condição", CONDITION_LABELS[draft.condition] ?? "—"],
                  ["Horas de uso", draft.hours ? `${draft.hours}h` : "—"],
                  [
                    "Preço",
                    draft.priceOnRequest ? "Sob consulta" : formatBRL(Number(draft.price) || 0),
                  ],
                  ["Localização", [draft.city, draft.state].filter(Boolean).join(" • ") || "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-right font-medium text-forest">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-xs text-muted-foreground">
                Ao enviar, seu anúncio entra em análise. Ele só ficará visível no catálogo após a
                aprovação da equipe DDP AGRO.
              </p>
            </div>
          )}

          <div className="mt-7 flex items-center justify-between border-t border-border pt-5">
            <Button
              variant="ghost"
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={!canAdvance()}
                onClick={() => setStep((s) => s + 1)}
              >
                Continuar <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <Button
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={submitting}
                onClick={() => void submit()}
              >
                <Send className="mr-1.5 h-4 w-4" />
                {submitting ? "Enviando..." : "Enviar para análise"}
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Check className="h-3.5 w-3.5 text-accent" />
          Anúncios passam por verificação antes de ficarem visíveis — isso protege compradores e
          vendedores.
        </div>
      </div>
    </AppPage>
  );
}
