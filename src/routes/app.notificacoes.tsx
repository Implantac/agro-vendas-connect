import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { fetchNotifications, markAllNotificationsRead } from "@/lib/app-queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/notificacoes")({
  head: () => ({
    meta: [
      { title: "Notificações | DDP AGRO" },
      { name: "description", content: "Atualizações sobre propostas, anúncios e mensagens." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Notificacoes,
});

function Notificacoes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => fetchNotifications(user!.id),
    enabled: Boolean(user),
  });

  const unread = notifications.filter((n) => !n.read_at).length;

  async function markAll() {
    if (!user) return;
    await markAllNotificationsRead(user.id);
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <AppPage>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-forest sm:text-3xl">Notificações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unread > 0 ? `${unread} não ${unread === 1 ? "lida" : "lidas"}` : "Tudo em dia."}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={() => void markAll()}>
            <CheckCheck className="mr-1.5 h-4 w-4" /> Marcar todas como lidas
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="mt-8 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-secondary/60" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
          <Bell className="h-10 w-10 text-muted-foreground/50" />
          <h2 className="mt-4 font-display text-lg font-semibold text-forest">
            Nenhuma notificação
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Atualizações sobre propostas, anúncios e mensagens aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-2">
          {notifications.map((n) => {
            const content = (
              <div
                className={cn(
                  "flex gap-3 rounded-lg border p-4 transition-colors",
                  n.read_at
                    ? "border-border bg-card"
                    : "border-accent/30 bg-secondary/40 hover:bg-secondary/60",
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    n.read_at ? "bg-border" : "bg-accent",
                  )}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-forest">{n.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
            return n.action_url?.startsWith("/app") ? (
              <Link key={n.id} to={n.action_url as "/app"}>
                {content}
              </Link>
            ) : (
              <div key={n.id}>{content}</div>
            );
          })}
        </div>
      )}
    </AppPage>
  );
}
