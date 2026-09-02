import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppPage } from "@/components/app/AppLayout";
import { fetchAuditLogs } from "@/lib/admin-queries";

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

function AdminAudit() {
  const { data: logs = [], isLoading } = useQuery({ queryKey: ["admin", "audit"], queryFn: fetchAuditLogs });

  return (
    <AppPage>
      <h1 className="font-display text-2xl font-bold text-forest">Auditoria</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Histórico imutável das ações administrativas registradas no backend.
      </p>

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
