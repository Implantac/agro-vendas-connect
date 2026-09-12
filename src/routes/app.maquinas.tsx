import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Pencil, Plus, Tractor, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MachineDossierDialog } from "@/components/app/MachineDossierDialog";
import { VERIFICATION_LABEL } from "@/lib/machine-docs";
import { useAuth } from "@/hooks/useAuth";
import { fetchCategories } from "@/lib/queries";
import {
  EMPTY_MACHINE,
  createMachine,
  deleteMachine,
  fetchMachinesWithListings,
  updateMachine,
  type MachineFormValues,
} from "@/lib/machines";

export const Route = createFileRoute("/app/maquinas")({
  head: () => ({
    meta: [
      { title: "Minhas máquinas | DDP AGRO" },
      {
        name: "description",
        content:
          "Cadastro permanente das suas máquinas e implementos, reaproveitado em novos anúncios.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Maquinas,
});

const CONDITIONS = [
  { value: "semi_new", label: "Seminovo" },
  { value: "used", label: "Usado" },
];

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  in_review: "Em análise",
  approved: "Publicado",
  rejected: "Rejeitado",
  paused: "Pausado",
  archived: "Arquivado",
};

function Maquinas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MachineFormValues>(EMPTY_MACHINE);
  const [saving, setSaving] = useState(false);
  const [dossier, setDossier] = useState<{ id: string; name: string } | null>(null);

  const { data: machines = [], isLoading } = useQuery({
    queryKey: ["my-machines-full", user?.id],
    queryFn: () => fetchMachinesWithListings(user!.id),
    enabled: Boolean(user),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const set = <K extends keyof MachineFormValues>(key: K, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  function startEdit(machine: (typeof machines)[number]) {
    setEditingId(machine.id);
    setForm({
      categoryId: machine.category_id ?? "",
      brand: machine.brand ?? "",
      model: machine.model ?? "",
      year: machine.manufacture_year ? String(machine.manufacture_year) : "",
      condition: machine.condition,
      hours: machine.hours_used ? String(machine.hours_used) : "",
    });
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY_MACHINE);
  }

  async function save() {
    if (!user) return;
    if (!form.brand.trim() || !form.model.trim()) {
      toast.error("Informe marca e modelo da máquina.");
      return;
    }
    setSaving(true);
    try {
      if (editingId) await updateMachine(editingId, user.id, form);
      else await createMachine(user.id, form);
      toast.success(editingId ? "Máquina atualizada." : "Máquina cadastrada.");
      reset();
      void queryClient.invalidateQueries({ queryKey: ["my-machines-full"] });
      void queryClient.invalidateQueries({ queryKey: ["my-machines"] });
    } catch {
      toast.error("Não foi possível salvar a máquina.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(machineId: string, listings: number) {
    if (!user) return;
    if (listings > 0) {
      toast.error("Exclua ou arquive os anúncios ligados a esta máquina antes de removê-la.");
      return;
    }
    try {
      await deleteMachine(machineId, user.id);
      toast.success("Máquina removida.");
      if (editingId === machineId) reset();
      void queryClient.invalidateQueries({ queryKey: ["my-machines-full"] });
    } catch {
      toast.error("Não foi possível remover a máquina.");
    }
  }

  return (
    <AppPage>
      <h1 className="text-2xl font-bold tracking-tight text-forest">Minhas máquinas</h1>
      <p className="text-sm text-muted-foreground">
        Cadastro permanente dos seus equipamentos. Cada anúncio usa uma máquina cadastrada, sem
        precisar redigitar a ficha técnica.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr] lg:items-start">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold text-forest">
            {editingId ? "Editar máquina" : "Nova máquina"}
          </h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
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
                <Label htmlFor="brand">Marca *</Label>
                <Input
                  id="brand"
                  value={form.brand}
                  onChange={(e) => set("brand", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Modelo *</Label>
                <Input
                  id="model"
                  value={form.model}
                  onChange={(e) => set("model", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Ano de fabricação</Label>
                <Input
                  id="year"
                  inputMode="numeric"
                  value={form.year}
                  onChange={(e) => set("year", e.target.value.replace(/\D/g, "").slice(0, 4))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hours">Horas de uso</Label>
                <Input
                  id="hours"
                  inputMode="numeric"
                  value={form.hours}
                  onChange={(e) => set("hours", e.target.value.replace(/\D/g, ""))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Condição</Label>
              <Select value={form.condition} onValueChange={(v) => set("condition", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar máquina"}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={reset}>
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando suas máquinas...</p>
          ) : machines.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
              <Tractor className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Você ainda não cadastrou máquinas. Cadastre a primeira ao lado.
              </p>
            </div>
          ) : (
            machines.map((machine) => {
              const listings = machine.listings ?? [];
              const category = (machine.categories as { name: string } | null)?.name;
              return (
                <div
                  key={machine.id}
                  className="rounded-lg border border-border bg-card p-5 sm:flex sm:items-start sm:justify-between sm:gap-4"
                >
                  <div>
                    <p className="font-semibold text-forest">
                      {[machine.brand, machine.model].filter(Boolean).join(" ") ||
                        "Máquina sem identificação"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[
                        category,
                        machine.manufacture_year ? `Ano ${machine.manufacture_year}` : null,
                        machine.hours_used ? `${machine.hours_used} h` : null,
                        machine.condition === "semi_new" ? "Seminovo" : "Usado",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="mt-1 text-xs font-medium text-forest">
                      {VERIFICATION_LABEL[machine.verification_status] ??
                        VERIFICATION_LABEL["unverified"]}
                    </p>
                    <div className="mt-3 space-y-1">
                      {listings.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Sem anúncio vinculado.</p>
                      ) : (
                        listings.map((listing) => (
                          <p key={listing.id} className="text-xs text-muted-foreground">
                            <Link
                              to="/app/anuncio/$id"
                              params={{ id: listing.id }}
                              className="font-medium text-forest underline-offset-2 hover:underline"
                            >
                              {listing.title}
                            </Link>{" "}
                            — {STATUS_LABEL[listing.status] ?? listing.status}
                          </p>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 sm:mt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setDossier({
                          id: machine.id,
                          name:
                            [machine.brand, machine.model].filter(Boolean).join(" ") ||
                            "Máquina sem identificação",
                        })
                      }
                    >
                      <FileText className="mr-1.5 h-4 w-4" /> Documentos e histórico
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => startEdit(machine)}>
                      <Pencil className="mr-1.5 h-4 w-4" /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void remove(machine.id, listings.length)}
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" /> Excluir
                    </Button>
                  </div>
                </div>
              );
            })
          )}
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to="/app/publicar">
              <Plus className="mr-1.5 h-4 w-4" /> Publicar anúncio com uma máquina cadastrada
            </Link>
          </Button>
        </div>
      </div>

      {user && (
        <MachineDossierDialog
          machineId={dossier?.id ?? null}
          machineName={dossier?.name ?? ""}
          ownerId={user.id}
          onOpenChange={(open) => !open && setDossier(null)}
        />
      )}
    </AppPage>
  );
}
