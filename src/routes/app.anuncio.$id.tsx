import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ImagePlus, Star, Trash2 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { fetchCategories } from "@/lib/queries";
import { BRAZILIAN_STATES, SALE_CONDITION_LABELS, LISTING_STATUS_LABELS } from "@/lib/format";
import {
  deleteListing,
  deleteListingPhoto,
  fetchListingMedia,
  setCoverPhoto,
  setListingStatus,
  updateListing,
  uploadListingPhotos,
  type ListingFormValues,
} from "@/lib/listing-manage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/anuncio/$id")({
  head: () => ({
    meta: [
      { title: "Editar anúncio | DDP AGRO" },
      { name: "description", content: "Edite fotos, dados técnicos e preço do seu anúncio." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditarAnuncio,
});

const EMPTY: ListingFormValues = {
  categoryId: "",
  title: "",
  brand: "",
  model: "",
  year: "",
  condition: "used",
  hours: "",
  description: "",
  price: "",
  priceOnRequest: false,
  city: "",
  state: "",
};

function EditarAnuncio() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<ListingFormValues>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing-edit", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: media = [] } = useQuery({
    queryKey: ["listing-media", id],
    queryFn: () => fetchListingMedia(id),
  });

  useEffect(() => {
    if (!listing) return;
    setValues({
      categoryId: listing.category_id ?? "",
      title: listing.title,
      brand: listing.brand ?? "",
      model: listing.model ?? "",
      year: listing.manufacture_year ? String(listing.manufacture_year) : "",
      condition: listing.condition,
      hours: listing.hours_used ? String(listing.hours_used) : "",
      description: listing.description ?? "",
      price: listing.price ? String(listing.price) : "",
      priceOnRequest: listing.price_on_request,
      city: listing.city ?? "",
      state: listing.state ?? "",
    });
  }, [listing]);

  const set = <K extends keyof ListingFormValues>(key: K, value: ListingFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["listing-edit", id] });
    void queryClient.invalidateQueries({ queryKey: ["listing-media", id] });
    void queryClient.invalidateQueries({ queryKey: ["my-listings"] });
  }

  async function save(sendToReview: boolean) {
    if (!values.title.trim()) {
      toast.error("Informe o título do anúncio.");
      return;
    }
    setSaving(true);
    try {
      await updateListing(id, values);
      if (sendToReview) await setListingStatus(id, "in_review", null);
      toast.success(sendToReview ? "Anúncio enviado para análise." : "Alterações salvas.");
      refresh();
    } catch {
      toast.error("Não foi possível salvar o anúncio.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length || !user) return;
    setUploading(true);
    try {
      await uploadListingPhotos(user.id, id, Array.from(files), media.length);
      toast.success("Fotos adicionadas.");
      refresh();
    } catch {
      toast.error("Não foi possível enviar as fotos.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeListing() {
    if (!window.confirm("Excluir definitivamente este anúncio?")) return;
    try {
      await deleteListing(id);
      toast.success("Anúncio excluído.");
      void queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      void navigate({ to: "/app/meus-anuncios" });
    } catch {
      toast.error("Não foi possível excluir o anúncio.");
    }
  }

  if (isLoading) {
    return (
      <AppPage>
        <div className="h-40 animate-pulse rounded-lg bg-secondary/60" />
      </AppPage>
    );
  }

  if (!listing) {
    return (
      <AppPage>
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">Anúncio não encontrado.</p>
          <Button asChild className="mt-4">
            <Link to="/app/meus-anuncios">Voltar para meus anúncios</Link>
          </Button>
        </div>
      </AppPage>
    );
  }

  return (
    <AppPage>
      <div className="mx-auto max-w-2xl">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/app/meus-anuncios">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Meus anúncios
          </Link>
        </Button>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-forest">Editar anúncio</h1>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-forest">
            {LISTING_STATUS_LABELS[listing.status] ?? listing.status}
          </span>
        </div>
        {listing.moderation_notes && (
          <p className="mt-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            Observação da moderação: {listing.moderation_notes}
          </p>
        )}

        {/* Fotos */}
        <section className="mt-6 rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold text-forest">Fotos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A primeira foto marcada como capa aparece no catálogo.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {media.map((m) => (
              <div key={m.id} className="group relative overflow-hidden rounded-md border border-border">
                <img src={m.url} alt="" className="h-28 w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-background/80 p-1">
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium",
                      m.is_cover ? "text-accent" : "text-muted-foreground hover:text-forest",
                    )}
                    onClick={async () => {
                      await setCoverPhoto(id, m.id);
                      refresh();
                    }}
                  >
                    <Star className="h-3 w-3" /> {m.is_cover ? "Capa" : "Definir capa"}
                  </button>
                  <button
                    type="button"
                    className="rounded px-1.5 py-0.5 text-destructive"
                    onClick={async () => {
                      await deleteListingPhoto(m.id);
                      refresh();
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex h-28 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border text-xs font-medium text-muted-foreground hover:border-accent/60"
            >
              <ImagePlus className="h-5 w-5" />
              {uploading ? "Enviando..." : "Adicionar fotos"}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => void handleFiles(e.target.files)}
          />
        </section>

        {/* Dados */}
        <section className="mt-6 space-y-5 rounded-lg border border-border bg-card p-6">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input id="title" value={values.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={values.categoryId} onValueChange={(v) => set("categoryId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input id="brand" value={values.brand} onChange={(e) => set("brand", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Modelo</Label>
              <Input id="model" value={values.model} onChange={(e) => set("model", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Ano</Label>
              <Input
                id="year"
                inputMode="numeric"
                value={values.year}
                onChange={(e) => set("year", e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours">Horas de uso</Label>
              <Input
                id="hours"
                inputMode="numeric"
                value={values.hours}
                onChange={(e) => set("hours", e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Condição</Label>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(SALE_CONDITION_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set("condition", value)}
                  className={cn(
                    "rounded-lg border-2 p-3 text-sm font-semibold transition-all",
                    values.condition === value
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
              rows={5}
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-forest">
            <input
              type="checkbox"
              checked={values.priceOnRequest}
              onChange={(e) => set("priceOnRequest", e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Preço sob consulta
          </label>
          {!values.priceOnRequest && (
            <div className="space-y-2">
              <Label htmlFor="price">Valor (R$)</Label>
              <Input
                id="price"
                inputMode="decimal"
                value={values.price}
                onChange={(e) => set("price", e.target.value.replace(/[^\d.]/g, ""))}
              />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" value={values.city} onChange={(e) => set("city", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={values.state} onValueChange={(v) => set("state", v)}>
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
        </section>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => void removeListing()}
          >
            <Trash2 className="mr-1.5 h-4 w-4" /> Excluir anúncio
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={saving} onClick={() => void save(false)}>
              Salvar alterações
            </Button>
            <Button
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={saving}
              onClick={() => void save(true)}
            >
              Salvar e enviar para análise
            </Button>
          </div>
        </div>
      </div>
    </AppPage>
  );
}
