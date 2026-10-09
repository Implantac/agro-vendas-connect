import { createFileRoute } from "@tanstack/react-router";

/**
 * Health check para monitoramento e balanceadores.
 * Responde só que o processo da aplicação está de pé. Não consulta o banco
 * e não expõe versão, variáveis ou detalhes de infraestrutura.
 * Verificação de banco e de pagamentos fica no runbook (docs/OPERACAO.md).
 */
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify({ status: "ok", time: new Date().toISOString() }), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
          },
        }),
      HEAD: async () =>
        new Response(null, {
          status: 200,
          headers: { "cache-control": "no-store" },
        }),
    },
  },
});
