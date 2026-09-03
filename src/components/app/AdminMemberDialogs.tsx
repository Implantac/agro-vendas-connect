import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  adminCreateUser,
  adminSendPasswordReset,
  adminSetPassword,
  adminUpdateProfile,
} from "@/lib/admin-users.functions";

type Role = "buyer" | "seller" | "admin";
type Status = "pending" | "approved" | "rejected" | "suspended";

const ROLES: { value: Role; label: string }[] = [
  { value: "buyer", label: "Comprador" },
  { value: "seller", label: "Vendedor" },
  { value: "admin", label: "Administrador" },
];

const STATUSES: { value: Status; label: string }[] = [
  { value: "pending", label: "Pendente" },
  { value: "approved", label: "Aprovado" },
  { value: "rejected", label: "Rejeitado" },
  { value: "suspended", label: "Suspenso" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function selectClass() {
  return "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
}

export function AdminCreateMemberDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const createUser = useServerFn(adminCreateUser);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    city: "",
    state: "",
    person_type: "pf" as "pf" | "pj",
    role: "buyer" as Role,
    status: "approved" as Status,
  });

  const mutation = useMutation({
    mutationFn: () => createUser({ data: form }),
    onSuccess: () => {
      toast.success("Membro criado com senha definida.");
      setOpen(false);
      setForm({ ...form, full_name: "", email: "", password: "", phone: "" });
      void qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error("Não foi possível criar o membro.", { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Novo membro</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar membro</DialogTitle>
          <DialogDescription>
            O acesso é criado já confirmado, com a senha que você definir.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Nome completo">
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </Field>
          </div>
          <Field label="E-mail">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Senha (mín. 8 caracteres)">
            <Input
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
          <Field label="Telefone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Tipo de pessoa">
            <select
              className={selectClass()}
              value={form.person_type}
              onChange={(e) => setForm({ ...form, person_type: e.target.value as "pf" | "pj" })}
            >
              <option value="pf">Pessoa física</option>
              <option value="pj">Pessoa jurídica</option>
            </select>
          </Field>
          <Field label="Cidade">
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
          <Field label="Estado (UF)">
            <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          </Field>
          <Field label="Perfil de acesso">
            <select
              className={selectClass()}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Situação">
            <select
              className={selectClass()}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as Status })}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <DialogFooter>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Criando..." : "Criar membro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface AdminMemberRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  city: string | null;
  state: string | null;
  person_type: string;
}

export function AdminEditMemberDialog({ member }: { member: AdminMemberRow }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const updateProfile = useServerFn(adminUpdateProfile);
  const setUserPassword = useServerFn(adminSetPassword);
  const sendReset = useServerFn(adminSendPasswordReset);

  const [form, setForm] = useState({
    full_name: member.full_name,
    email: member.email,
    phone: "",
    city: member.city ?? "",
    state: member.state ?? "",
    person_type: (member.person_type as "pf" | "pj") ?? "pf",
    role: member.role as Role,
    status: member.status as Status,
    rejection_reason: "",
  });

  const saveMutation = useMutation({
    mutationFn: () => updateProfile({ data: { userId: member.id, ...form } }),
    onSuccess: () => {
      toast.success("Perfil atualizado.");
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error("Não foi possível salvar.", { description: e.message }),
  });

  const passwordMutation = useMutation({
    mutationFn: () => setUserPassword({ data: { userId: member.id, password } }),
    onSuccess: () => {
      toast.success("Nova senha definida.");
      setPassword("");
    },
    onError: (e: Error) => toast.error("Não foi possível definir a senha.", { description: e.message }),
  });

  const resetMutation = useMutation({
    mutationFn: () =>
      sendReset({
        data: {
          email: form.email,
          ...(typeof window !== "undefined"
            ? { redirectTo: `${window.location.origin}/redefinir-senha` }
            : {}),
        },

      }),
    onSuccess: () => toast.success("E-mail de redefinição enviado."),
    onError: (e: Error) => toast.error("Não foi possível enviar o e-mail.", { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar membro</DialogTitle>
          <DialogDescription>Dados cadastrais, perfil de acesso e senha.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Nome completo">
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </Field>
          </div>
          <Field label="E-mail">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Telefone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Cidade">
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
          <Field label="Estado (UF)">
            <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          </Field>
          <Field label="Tipo de pessoa">
            <select
              className={selectClass()}
              value={form.person_type}
              onChange={(e) => setForm({ ...form, person_type: e.target.value as "pf" | "pj" })}
            >
              <option value="pf">Pessoa física</option>
              <option value="pj">Pessoa jurídica</option>
            </select>
          </Field>
          <Field label="Perfil de acesso">
            <select
              className={selectClass()}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Situação">
            <select
              className={selectClass()}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as Status })}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Observação / motivo (opcional)">
              <Input
                value={form.rejection_reason}
                onChange={(e) => setForm({ ...form, rejection_reason: e.target.value })}
              />
            </Field>
          </div>
        </div>

        <div className="mt-2 rounded-md border border-border bg-secondary/40 p-3">
          <p className="text-xs font-semibold text-forest">Senha de acesso</p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <div className="min-w-[200px] flex-1">
              <Input
                placeholder="Nova senha (mín. 8 caracteres)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              disabled={passwordMutation.isPending || password.length < 8}
              onClick={() => passwordMutation.mutate()}
            >
              Definir senha
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={resetMutation.isPending}
              onClick={() => resetMutation.mutate()}
            >
              Enviar redefinição
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
