import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppPage } from "@/components/app/AppLayout";
import { fetchAuditLogs } from "@/lib/admin-queries";
import { fetchFinancialAlerts, fetchSystemEvents } from "@/lib/observability";

export const Route = createFileRoute("/app/admin/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoria | Admin DDP AGRO" },
      { name: "description", content: "Registro das ações administrativas na plataforma." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminAudit,
});

const SEVERITY_LABEL: Record<string, string> = {
  info: "Informação",
  warning: "Atenção",
  error: "Erro",
  critical: "Crítico",
};

function AdminAudit() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: fetchAuditLogs,
  });
  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["admin", "system-events"],
    queryFn: () => fetchSystemEvents(),
    refetchInterval: 60_000,
  });
  const { data: alerts } = useQuery({
    queryKey: ["admin", "financial-alerts"],
    queryFn: fetchFinancialAlerts,
    refetchInterval: 60_000,
  });

  return (
    <AppPage>
      <h1 className="font-display text-2xl font-bold text-forest">Auditoria e monitoramento</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Histórico imutável das ações administrativas e falhas registradas no backend.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Pedidos aguardando pagamento", value: alerts?.ordersAwaitingPayment ?? 0 },
          { label: "Parados há mais de 7 dias", value: alerts?.ordersStuck7Days ?? 0 },
          { label: "Falhas registradas", value: alerts?.criticalEvents ?? 0 },
        ].map((card) => (
          <div key={card.label} className="rounded-md border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-forest">{card.value}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 font-display text-lg font-semibold text-forest">Falhas e eventos</h2>
      <div className="mt-3 overflow-hidden rounded-md border border-border bg-card">
        <ul className="divide-y divide-border">
          {loadingEvents && (
            <li className="px-5 py-6 text-sm text-muted-foreground">Carregando...</li>
          )}
          {!loadingEvents && events.length === 0 && (
            <li className="px-5 py-6 text-sm text-muted-foreground">
              Nenhuma falha registrada até agora.
            </li>
          )}
          {events.map((event) => (
            <li key={event.id} className="px-5 py-3 text-sm">
              <p className="font-medium text-forest">
                {SEVERITY_LABEL[event.severity] ?? event.severity} • {event.source}
              </p>
              <p className="mt-0.5 break-words text-muted-foreground">{event.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(event.created_at).toLocaleString("pt-BR")}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <h2 className="mt-10 font-display text-lg font-semibold text-forest">Ações administrativas</h2>


      <div className="mt-6 overflow-hidden rounded-md border border-border bg-card">
        <ul className="divide-y divide-border">
          {isLoading && <li className="px-5 py-6 text-sm text-muted-foreground">Carregando...</li>}
          {!isLoading && logs.length === 0 && (
            <li className="px-5 py-6 text-sm text-muted-foreground">Nenhum registro ainda.</li>
          )}
          {logs.map((log) => (
            <li key={log.id} className="px-5 py-3 text-sm">
              <p className="font-medium text-forest">{log.action}</p>
              <p className="text-xs text-muted-foreground">
                {log.entity_type ?? "—"} • {new Date(log.created_at).toLocaleString("pt-BR")}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </AppPage>
  );
}
