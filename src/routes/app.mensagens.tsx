import { type FormEvent, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { fetchConversations, fetchMessages, sendMessage } from "@/lib/app-queries";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

const searchSchema = z.object({ conversa: z.string().optional() });

export const Route = createFileRoute("/app/mensagens")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Mensagens | DDP AGRO" },
      { name: "description", content: "Conversas com compradores e vendedores." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Mensagens,
});

function Mensagens() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: () => fetchConversations(user!.id),
    enabled: Boolean(user),
  });

  const activeId = search.conversa ?? conversations[0]?.id;
  const active = conversations.find((c) => c.id === activeId);

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", activeId],
    queryFn: () => fetchMessages(activeId!),
    enabled: Boolean(activeId),
  });

  // Realtime: novas mensagens na conversa ativa
  useEffect(() => {
    if (!activeId) return;
    const channel = supabase
      .channel(`messages:${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["messages", activeId] });
          void queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeId, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !activeId || !user) return;
    setDraft("");
    await sendMessage(activeId, user.id, content);
    void queryClient.invalidateQueries({ queryKey: ["messages", activeId] });
  }

  return (
    <AppPage>
      <h1 className="font-display text-2xl font-bold text-forest sm:text-3xl">Mensagens</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Todas as conversas acontecem dentro da plataforma, com histórico preservado.
      </p>

      {conversations.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
          <MessageSquare className="h-10 w-10 text-muted-foreground/50" />
          <h2 className="mt-4 font-display text-lg font-semibold text-forest">
            Nenhuma conversa ainda
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Envie uma proposta em um anúncio para iniciar uma conversa com o vendedor.
          </p>
          <Button asChild className="mt-5 bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/app/comprar">Explorar catálogo</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-7 grid overflow-hidden rounded-lg border border-border bg-card lg:grid-cols-[320px_1fr]">
          {/* Lista de conversas */}
          <aside
            className={cn(
              "border-border lg:border-r",
              active && "hidden lg:block",
            )}
          >
            <div className="border-b border-border p-4">
              <p className="text-sm font-semibold text-forest">
                {conversations.length} {conversations.length === 1 ? "conversa" : "conversas"}
              </p>
            </div>
            <div className="max-h-[560px] overflow-y-auto">
              {conversations.map((c) => {
                const listing = c.listings as {
                  title: string;
                  price: number | null;
                  listing_media: { url: string; is_cover: boolean }[] | null;
                } | null;
                const lastMsg = (c.messages as { content: string; created_at: string }[] | null)
                  ?.slice(-1)[0];
                const cover = listing?.listing_media?.find((m) => m.is_cover) ??
                  listing?.listing_media?.[0];
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => void navigate({ search: { conversa: c.id } })}
                    className={cn(
                      "flex w-full items-center gap-3 border-b border-border p-4 text-left transition-colors hover:bg-secondary/50",
                      c.id === activeId && "bg-secondary/70",
                    )}
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-secondary">
                      {cover && (
                        <img src={cover.url} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-forest">
                        {listing?.title ?? "Conversa"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {lastMsg?.content ?? "Conversa iniciada"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Thread */}
          {active ? (
            <section className="flex min-h-[560px] flex-col">
              {(() => {
                const listing = active.listings as {
                  title: string;
                  slug: string;
                  price: number | null;
                } | null;
                return (
                  <header className="flex items-center justify-between gap-3 border-b border-border p-4">
                    <div className="min-w-0">
                      <p className="truncate font-display text-base font-semibold text-forest">
                        {listing?.title ?? "Conversa"}
                      </p>
                      {listing && (
                        <Link
                          to="/implementos/$slug"
                          params={{ slug: listing.slug }}
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          {listing.price ? formatBRL(listing.price) : "Preço sob consulta"} • Ver
                          anúncio
                        </Link>
                      )}
                    </div>
                    <span className="hidden items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-forest sm:flex">
                      <ShieldCheck className="h-3.5 w-3.5 text-accent" /> Ambiente protegido
                    </span>
                  </header>
                );
              })()}

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((m) => {
                  const mine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                          mine
                            ? "rounded-br-sm bg-accent text-accent-foreground"
                            : "rounded-bl-sm bg-secondary text-forest",
                        )}
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>
                        <p
                          className={cn(
                            "mt-1 text-right text-[10px]",
                            mine ? "text-accent-foreground/70" : "text-muted-foreground",
                          )}
                        >
                          {new Date(m.created_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={(e) => void handleSend(e)} className="flex gap-2 border-t border-border p-4">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Escreva sua mensagem..."
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  disabled={!draft.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </section>
          ) : (
            <section className="hidden min-h-[560px] items-center justify-center lg:flex">
              <p className="text-sm text-muted-foreground">
                Selecione uma conversa para visualizar as mensagens.
              </p>
            </section>
          )}
        </div>
      )}
    </AppPage>
  );
}
