import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderTree, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/admin/categorias")({
  head: () => ({
    meta: [
      { title: "Categorias | Admin DDP AGRO" },
      {
        name: "description",
        content: "Cadastre e organize as categorias de implementos agrícolas da plataforma.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminCategories,
});

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  active: boolean;
}

function AdminCategories() {
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,slug,description,sort_order,active")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as CategoryRow[];
    },
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    void qc.invalidateQueries({ queryKey: ["categories"] });
  };

  const create = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("categories").insert({
        name: name.trim(),
        slug: slugify(name),
        sort_order: (categories.at(-1)?.sort_order ?? 0) + 10,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewName("");
      toast.success("Categoria criada.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível criar a categoria."),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CategoryRow> }) => {
      const { error } = await supabase.from("categories").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Categoria atualizada.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível atualizar."),
  });

  return (
    <AppPage>
      <h1 className="font-display text-2xl font-bold text-forest">Categorias</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Defina os tipos de implemento disponíveis para anúncio e busca.
      </p>

      <form
        className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (newName.trim().length < 3) {
            toast.error("Informe um nome com pelo menos 3 letras.");
            return;
          }
          create.mutate(newName);
        }}
      >
        <div className="min-w-56 flex-1">
          <Label htmlFor="new-category">Nova categoria</Label>
          <Input
            id="new-category"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ex.: Plantadeiras"
          />
        </div>
        <Button type="submit" disabled={create.isPending}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar
        </Button>
      </form>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-secondary/60" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-lg border border-dashed border-border bg-card px-6 py-14 text-center">
          <FolderTree className="h-9 w-9 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {categories.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4"
            >
              <Input
                className="min-w-48 flex-1"
                defaultValue={c.name}
                onBlur={(e) => {
                  const name = e.target.value.trim();
                  if (name && name !== c.name) update.mutate({ id: c.id, patch: { name } });
                }}
              />
              <Input
                className="w-28"
                type="number"
                defaultValue={c.sort_order}
                onBlur={(e) => {
                  const sort_order = Number(e.target.value);
                  if (Number.isFinite(sort_order) && sort_order !== c.sort_order)
                    update.mutate({ id: c.id, patch: { sort_order } });
                }}
              />
              <span className="text-xs text-muted-foreground">/{c.slug}</span>
              <label className="ml-auto flex items-center gap-2 text-sm text-forest">
                <Switch
                  checked={c.active}
                  onCheckedChange={(active) => update.mutate({ id: c.id, patch: { active } })}
                />
                {c.active ? "Ativa" : "Inativa"}
              </label>
            </li>
          ))}
        </ul>
      )}
    </AppPage>
  );
}
