import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { z } from "zod";

/**
 * Webhook da Asaas (membresia).
 * - Autenticação pelo cabeçalho "asaas-access-token" (= PAYMENT_WEBHOOK_SECRET);
 * - idempotência no banco pela chave (provider, event_id);
 * - valor menor que o cobrado nunca confirma a membresia;
 * - exclusão/estorno revertem a situação do pagamento.
 */

const payloadSchema = z.object({
  id: z.string().min(1),
  event: z.string().min(1),
  payment: z
    .object({
      id: z.string(),
      externalReference: z.string().nullable().optional(),
      value: z.number().optional(),
    })
    .optional(),
});

const STATUS: Record<string, string> = {
  PAYMENT_RECEIVED: "paid",
  PAYMENT_CONFIRMED: "paid",
  PAYMENT_DELETED: "cancelled",
  PAYMENT_REPROVED_BY_RISK_ANALYSIS: "failed",
  PAYMENT_CREDIT_CARD_CAPTURE_REFUSED: "failed",
  PAYMENT_REFUNDED: "refunded",
  PAYMENT_CHARGEBACK_REQUESTED: "refunded",
};

function validToken(header: string | null, secret: string) {
  if (!header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/webhooks/payments")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PAYMENT_WEBHOOK_SECRET"];
        if (!secret) {
          return Response.json({ error: "payment_gateway_not_configured" }, { status: 503 });
        }
        if (!validToken(request.headers.get("asaas-access-token"), secret)) {
          return new Response("Invalid token", { status: 401 });
        }

        const raw = await request.text();
        let parsed: z.infer<typeof payloadSchema>;
        try {
          parsed = payloadSchema.parse(JSON.parse(raw));
        } catch {
          return Response.json({ error: "invalid_payload" }, { status: 400 });
        }

        const status = STATUS[parsed.event];
        const reference = parsed.payment?.externalReference;
        // Eventos sem efeito na membresia: responde 200 para a Asaas não reenviar.
        if (!status || !reference) return Response.json({ ok: true, ignored: true });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("gateway_apply_payment", {
          _provider: "asaas",
          _event_id: parsed.id,
          _event_type: parsed.event,
          _charge_reference: reference,
          _payment_status: status,
          _amount: parsed.payment?.value ?? 0,
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
