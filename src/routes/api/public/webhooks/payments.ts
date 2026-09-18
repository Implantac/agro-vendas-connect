import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

/**
 * Webhook do provedor de pagamento (membresia).
 *
 * Regras:
 * - assinatura HMAC-SHA256 obrigatória (segredo PAYMENT_WEBHOOK_SECRET);
 * - idempotência garantida no banco pela chave (provider, event_id);
 * - valor menor que o cobrado nunca confirma a membresia;
 * - cancelamento/estorno revertem a situação do pagamento.
 *
 * Enquanto o segredo e as credenciais do provedor não existirem, o endpoint
 * responde 503 "aguardando configuração" — nada é simulado.
 */

const payloadSchema = z.object({
  id: z.string().min(1),
  event: z.string().min(1),
  provider: z.string().min(1).optional(),
  charge: z.object({
    reference: z.string().min(1),
    status: z.enum(["pending", "paid", "failed", "cancelled", "refunded"]),
    amount: z.number().nonnegative().optional(),
  }),
});

function validSignature(raw: string, header: string | null, secret: string) {
  if (!header) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(header.replace(/^sha256=/, ""));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/webhooks/payments")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PAYMENT_WEBHOOK_SECRET"];
        if (!secret) {
          return Response.json(
            { error: "payment_gateway_not_configured" },
            { status: 503 },
          );
        }

        const raw = await request.text();
        if (!validSignature(raw, request.headers.get("x-webhook-signature"), secret)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let parsed: z.infer<typeof payloadSchema>;
        try {
          parsed = payloadSchema.parse(JSON.parse(raw));
        } catch {
          return Response.json({ error: "invalid_payload" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("gateway_apply_payment", {
          _provider: parsed.provider ?? "asaas",
          _event_id: parsed.id,
          _event_type: parsed.event,
          _charge_reference: parsed.charge.reference,
          _payment_status: parsed.charge.status,
          _amount: parsed.charge.amount ?? null,
          _payload: JSON.parse(raw),
        });

        if (error) {
          console.error("[payments-webhook]", error.message);
          return Response.json({ error: "processing_failed" }, { status: 500 });
        }

        return Response.json({ ok: true, result: data });
      },
    },
  },
});
