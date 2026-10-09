import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type MemberRole = "buyer" | "seller" | "admin";
type MemberStatus = "pending" | "approved" | "rejected" | "suspended";

async function assertAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
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

    // Se qualquer etapa seguinte falhar, o usuário de autenticação é removido para não
    // sobrar conta sem perfil (causa do achado de órfãos).
    const rollback = async (message: string): Promise<never> => {
      await supabaseAdmin.auth.admin.deleteUser(newId);
      throw new Error(message);
    };

    const { error: profileError } = await supabaseAdmin
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
    if (profileError) return rollback(`Falha ao gravar o perfil: ${profileError.message}`);

    if (data.role === "admin") {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: newId, role: "admin" });
      if (roleError) return rollback(`Falha ao conceder papel admin: ${roleError.message}`);
    }

    const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "admin_user_created",
      entity_type: "profile",
      entity_id: newId,
      metadata_json: { role: data.role, status: data.status },
    });
    if (auditError) return rollback(`Falha ao registrar auditoria: ${auditError.message}`);

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
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      if (roleError) throw new Error(`Falha ao conceder papel admin: ${roleError.message}`);
    } else if (data.userId !== context.userId) {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
      if (roleError) throw new Error(`Falha ao remover papel admin: ${roleError.message}`);
    }

    const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "admin_profile_updated",
      entity_type: "profile",
      entity_id: data.userId,
      metadata_json: { role: data.role, status: data.status },
    });
    if (auditError) throw new Error(`Falha ao registrar auditoria: ${auditError.message}`);

    return { ok: true };
  });

/**
 * Admin anonimiza um membro (LGPD, art. 16 e 18, VI). A conta é desativada e os dados pessoais
 * são substituídos. Pedidos, propostas e aceites legais são mantidos, porque têm retenção
 * obrigatória (fiscal/contratual) e são necessários para comprovar operações e consentimentos.
 */
export const adminAnonymizeUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; confirm: string }) => {
    if (!input.userId) throw new Error("Usuário inválido.");
    if (input.confirm !== "ANONIMIZAR") throw new Error("Confirmação inválida.");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId)
      throw new Error("Você não pode anonimizar a própria conta.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const anonEmail = `anonimizado-${data.userId}@anonimizado.invalid`;

    // Bloqueia novos logins e refresh de token antes de alterar os dados.
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      email: anonEmail,
      ban_duration: "876000h",
      user_metadata: {},
    });
    if (authError) throw new Error(`Falha ao bloquear a conta: ${authError.message}`);

    const steps: Array<[string, PromiseLike<{ error: { message: string } | null }>]> = [
      [
        "profiles",
        supabaseAdmin
          .from("profiles")
          .update({
            full_name: "Titular anonimizado",
            email: anonEmail,
            phone: null,
            city: null,
            state: null,
            rejection_reason: null,
            status: "suspended",
          })
          .eq("id", data.userId),
      ],
      [
        "seller_profiles",
        supabaseAdmin
          .from("seller_profiles")
          .update({
            legal_name: "Anonimizado",
            trade_name: "",
            company_description: "",
            website: null,
            logo_url: null,
          })
          .eq("user_id", data.userId),
      ],
      ["user_roles", supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId)],
      ["favorites", supabaseAdmin.from("favorites").delete().eq("user_id", data.userId)],
      ["saved_searches", supabaseAdmin.from("saved_searches").delete().eq("user_id", data.userId)],
      ["notifications", supabaseAdmin.from("notifications").delete().eq("user_id", data.userId)],
    ];

    const failures: string[] = [];
    for (const [table, step] of steps) {
      const { error } = await step;
      if (error) failures.push(`${table}: ${error.message}`);
    }
    if (failures.length > 0) {
      // Não registra sucesso parcial: o admin deve repetir a ação depois de corrigir a causa.
      throw new Error(`Anonimização incompleta. ${failures.join("; ")}`);
    }

    const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "admin_user_anonymized",
      entity_type: "profile",
      entity_id: data.userId,
      metadata_json: {},
    });
    if (auditError) throw new Error(`Falha ao registrar auditoria: ${auditError.message}`);

    return { ok: true };
  });

/** Admin exporta os dados pessoais de um membro (LGPD, art. 18, II e V). */
export const adminExportUserData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => {
    if (!input.userId) throw new Error("Usuário inválido.");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const id = data.userId;

    const queries = {
      profile: supabaseAdmin.from("profiles").select("*").eq("id", id).maybeSingle(),
      seller_profile: supabaseAdmin
        .from("seller_profiles")
        .select("*")
        .eq("user_id", id)
        .maybeSingle(),
      membership_requests: supabaseAdmin.from("membership_requests").select("*").eq("user_id", id),
      legal_acceptances: supabaseAdmin.from("legal_acceptances").select("*").eq("user_id", id),
      orders_as_buyer: supabaseAdmin.from("orders").select("*").eq("buyer_id", id),
      orders_as_seller: supabaseAdmin.from("orders").select("*").eq("seller_id", id),
      proposals_as_buyer: supabaseAdmin.from("proposals").select("*").eq("buyer_id", id),
      proposals_as_seller: supabaseAdmin.from("proposals").select("*").eq("seller_id", id),
      listings: supabaseAdmin.from("listings").select("*").eq("seller_id", id),
      machines: supabaseAdmin.from("machines").select("*").eq("owner_id", id),
      messages: supabaseAdmin.from("messages").select("*").eq("sender_id", id),
      favorites: supabaseAdmin.from("favorites").select("*").eq("user_id", id),
      saved_searches: supabaseAdmin.from("saved_searches").select("*").eq("user_id", id),
      notifications: supabaseAdmin.from("notifications").select("*").eq("user_id", id),
      privacy_requests: supabaseAdmin.from("privacy_requests").select("*").eq("user_id", id),
      contact_messages: supabaseAdmin.from("contact_messages").select("*").eq("user_id", id),
    } as const;

    const entries = await Promise.all(
      Object.entries(queries).map(async ([key, query]) => {
        const { data: rows, error } = await query;
        if (error) throw new Error(`Falha ao exportar ${key}: ${error.message}`);
        return [key, rows] as const;
      }),
    );

    const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "admin_user_exported",
      entity_type: "profile",
      entity_id: id,
      metadata_json: {},
    });
    if (auditError) throw new Error(`Falha ao registrar auditoria: ${auditError.message}`);

    return {
      exported_at: new Date().toISOString(),
      user_id: id,
      data: Object.fromEntries(entries),
    };
  });
