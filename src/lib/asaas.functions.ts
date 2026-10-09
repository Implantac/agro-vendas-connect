import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

/**
 * Gera a cobrança real da membresia na Asaas.
 * - Chave de teste ($aact_hmlg_) usa o ambiente sandbox; demais usam produção.
 * - externalReference = payment_reference; o webhook confirma o pagamento.
 * - CPF/CNPJ é enviado apenas à Asaas, não é gravado no banco.
 */

const Input = z.object({
  requestId: z.string().uuid(),
  cpfCnpj: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 11 || v.length === 14, "CPF ou CNPJ inválido"),
});

const BILLING: Record<string, string> = { pix: "PIX", boleto: "BOLETO", card: "CREDIT_CARD" };

async function asaas<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = process.env["ASAAS_API_KEY"];
  if (!key) throw new Error("Pagamento online indisponível no momento.");
  const base = key.startsWith("$aact_hmlg_")
    ? "https://api-sandbox.asaas.com/v3"
    : "https://api.asaas.com/v3";
  const res = await fetch(base + path, {
    ...init,
    signal: AbortSignal.timeout(15_000),
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "DDP-AGRO",
      access_token: key,
      ...(init.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as T & {
    errors?: { description?: string }[];
  };
  if (!res.ok) {
    console.error("[asaas]", res.status, JSON.stringify(body));
    throw new Error(body.errors?.[0]?.description ?? "Falha ao gerar a cobrança.");
  }
  return body;
}

export const createAsaasCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { data: req, error } = await context.supabase
      .from("membership_requests")
      .select(
        "id,user_id,amount,payment_method,payment_reference,status,checkout_url,membership_plans(name)",
      )
      .eq("id", data.requestId)
      .maybeSingle();
    if (error || !req || req.user_id !== context.userId)
      throw new Error("Solicitação não encontrada.");
    if (req.status !== "payment_pending")
      throw new Error("Esta solicitação não aguarda pagamento.");
    if (req.checkout_url) return { checkoutUrl: req.checkout_url };

    // Trava atômica: só uma chamada gera a cobrança. Outra tentativa dentro de 2 minutos é recusada
    // (evita duas cobranças na Asaas quando há clique duplo ou duas abas).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: claimed } = await supabaseAdmin
      .from("membership_requests")
      .update({ checkout_started_at: new Date().toISOString() })
      .eq("id", req.id)
      .is("checkout_url", null)
      .or(
        `checkout_started_at.is.null,checkout_started_at.lt.${new Date(Date.now() - 120_000).toISOString()}`,
      )
      .select("id");
    if (!claimed?.length) {
      const { data: fresh } = await supabaseAdmin
        .from("membership_requests")
        .select("checkout_url")
        .eq("id", req.id)
        .maybeSingle();
      if (fresh?.checkout_url) return { checkoutUrl: fresh.checkout_url };
      throw new Error(
        "A cobrança já está sendo gerada. Aguarde alguns segundos e atualize a página.",
      );
    }

    try {
      return await createCharge(req, data.cpfCnpj, context.userId, context.supabase);
    } catch (err) {
      if ((err as { keepClaim?: boolean }).keepClaim) throw err;
      // Libera a trava para nova tentativa quando a Asaas recusa ou fica indisponível.
      await supabaseAdmin
        .from("membership_requests")
        .update({ checkout_started_at: null })
        .eq("id", req.id)
        .is("checkout_url", null);
      throw err;
    }
  });

async function createCharge(
  req: {
    id: string;
    amount: number | string;
    payment_method: string | null;
    payment_reference: string | null;
    membership_plans: unknown;
  },
  cpfCnpj: string,
  userId: string,
  supabase: SupabaseClient<Database>,
): Promise<{ checkoutUrl: string }> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,email,phone")
    .eq("id", userId)
    .maybeSingle();

  const found = await asaas<{ data: { id: string }[] }>(
    `/customers?externalReference=${encodeURIComponent(userId)}`,
  );
  let customerId = found.data[0]?.id;
  if (customerId) {
    await asaas(`/customers/${customerId}`, {
      method: "PUT",
      body: JSON.stringify({ cpfCnpj }),
    });
  } else {
    const created = await asaas<{ id: string }>("/customers", {
      method: "POST",
      body: JSON.stringify({
        name: profile?.full_name || profile?.email || "Membro DDP AGRO",
        email: profile?.email,
        mobilePhone: profile?.phone?.replace(/\D/g, "") || undefined,
        cpfCnpj,
        externalReference: userId,
        notificationDisabled: true,
      }),
    });
    customerId = created.id;
  }

  const due = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const plan = (req.membership_plans as { name?: string } | null)?.name ?? "Membresia";
  const payment = await asaas<{ id: string; invoiceUrl: string }>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: customerId,
      billingType: BILLING[req.payment_method ?? "pix"] ?? "UNDEFINED",
      value: Number(req.amount),
      dueDate: due,
      description: `DDP AGRO — ${plan}`,
      externalReference: req.payment_reference,
    }),
  });

  // A cobrança já existe na Asaas. Tenta gravar o vínculo algumas vezes antes de desistir,
  // para reduzir a janela em que a trava expira e uma segunda cobrança seria criada.
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  let saveError: { message: string } | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const result = await admin
      .from("membership_requests")
      .update({
        gateway_payment_id: payment.id,
        checkout_url: payment.invoiceUrl,
        payment_provider: "asaas",
      })
      .eq("id", req.id);
    saveError = result.error;
    if (!saveError) break;
    await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
  }
  if (saveError) {
    // A cobrança já existe na Asaas: a trava NÃO é liberada, para não gerar uma segunda cobrança.
    console.error("[asaas] falha ao salvar cobrança", payment.id, saveError.message);
    throw Object.assign(
      new Error(
        "Cobrança criada, mas não foi possível registrá-la. Fale com a equipe informando o código da solicitação.",
      ),
      { keepClaim: true },
    );
  }

  return { checkoutUrl: payment.invoiceUrl };
}
