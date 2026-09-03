import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type MemberRole = "buyer" | "seller" | "admin";
type MemberStatus = "pending" | "approved" | "rejected" | "suspended";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Apenas administradores podem executar esta ação.");
}

/** Admin cria um novo membro já com senha definida. */
export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      email: string;
      password: string;
      full_name: string;
      role: MemberRole;
      status: MemberStatus;
      phone?: string;
      city?: string;
      state?: string;
      person_type?: "pf" | "pj";
    }) => {
      if (!input.email?.includes("@")) throw new Error("Informe um e-mail válido.");
      if (!input.password || input.password.length < 8)
        throw new Error("A senha deve ter ao menos 8 caracteres.");
      if (!input.full_name?.trim()) throw new Error("Informe o nome completo.");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
        role: data.role,
        phone: data.phone ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        person_type: data.person_type ?? "pf",
      },
    });
    if (error) throw new Error(error.message);
    const newId = created.user?.id;
    if (!newId) throw new Error("Não foi possível criar o usuário.");

    await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.full_name,
        email: data.email,
        role: data.role,
        status: data.status,
        phone: data.phone ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        person_type: data.person_type ?? "pf",
      })
      .eq("id", newId);

    if (data.role === "admin") {
      await supabaseAdmin.from("user_roles").insert({ user_id: newId, role: "admin" });
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "admin_user_created",
      entity_type: "profile",
      entity_id: newId,
      metadata_json: { role: data.role, status: data.status },
    });

    return { id: newId };
  });

/** Admin define uma nova senha para qualquer membro. */
export const adminSetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; password: string }) => {
    if (!input.userId) throw new Error("Usuário inválido.");
    if (!input.password || input.password.length < 8)
      throw new Error("A senha deve ter ao menos 8 caracteres.");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "admin_password_reset",
      entity_type: "profile",
      entity_id: data.userId,
      metadata_json: {},
    });
    return { ok: true };
  });

/** Admin envia e-mail de redefinição de senha para o membro. */
export const adminSendPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; redirectTo?: string }) => {
    if (!input.email?.includes("@")) throw new Error("E-mail inválido.");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(data.email, {
      ...(data.redirectTo ? { redirectTo: data.redirectTo } : {}),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin edita os dados cadastrais completos de um membro. */
export const adminUpdateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      userId: string;
      full_name: string;
      email: string;
      phone?: string;
      city?: string;
      state?: string;
      person_type: "pf" | "pj";
      role: MemberRole;
      status: MemberStatus;
      rejection_reason?: string;
    }) => {
      if (!input.userId) throw new Error("Usuário inválido.");
      if (!input.full_name?.trim()) throw new Error("Informe o nome completo.");
      if (!input.email?.includes("@")) throw new Error("Informe um e-mail válido.");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      email: data.email,
      user_metadata: { full_name: data.full_name },
    });
    if (authError) throw new Error(authError.message);

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.full_name,
        email: data.email,
        phone: data.phone ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        person_type: data.person_type,
        role: data.role,
        status: data.status,
        rejection_reason: data.rejection_reason ?? null,
      })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);

    if (data.role === "admin") {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
    } else if (data.userId !== context.userId) {
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "admin_profile_updated",
      entity_type: "profile",
      entity_id: data.userId,
      metadata_json: { role: data.role, status: data.status },
    });

    return { ok: true };
  });

/** Admin remove definitivamente um membro. */
export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => {
    if (!input.userId) throw new Error("Usuário inválido.");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId)
      throw new Error("Você não pode excluir a própria conta.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "admin_user_deleted",
      entity_type: "profile",
      entity_id: data.userId,
      metadata_json: {},
    });
    return { ok: true };
  });
