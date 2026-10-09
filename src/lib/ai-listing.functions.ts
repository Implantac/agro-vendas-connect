import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  category: z.string().max(120).optional().default(""),
  brand: z.string().max(120).optional().default(""),
  model: z.string().max(120).optional().default(""),
  year: z.string().max(4).optional().default(""),
  hours: z.string().max(12).optional().default(""),
  condition: z.string().max(60).optional().default(""),
  city: z.string().max(120).optional().default(""),
  state: z.string().max(60).optional().default(""),
  price: z.string().max(30).optional().default(""),
  notes: z.string().max(2000).optional().default(""),
  // Limite por imagem (~750 KB em base64). As fotos chegam já reduzidas para 768px pelo cliente.
  images: z
    .array(z.string().startsWith("data:image/").max(1_000_000, "Imagem grande demais."))
    .max(3)
    .optional()
    .default([]),
});

export type ListingCopy = {
  title: string;
  description: string;
  highlights: string[];
};

const SYSTEM = [
  "Você é redator de anúncios de máquinas e implementos agrícolas usados, para o marketplace brasileiro DDP AGRO.",
  "Escreva em português do Brasil, tom técnico, direto e honesto.",
  "Use apenas os dados fornecidos pelo vendedor e o que for claramente visível nas fotos.",
  "Nunca invente revisões, garantias, notas fiscais, laudos, horas de uso ou estado de conservação que não foram informados.",
  "Se um dado não foi informado, simplesmente não cite.",
  "Título: até 70 caracteres, com marca, modelo e ano quando existirem.",
  "Descrição: 2 a 4 parágrafos curtos (máximo 1200 caracteres no total), sem emojis, sem CAIXA ALTA, sem promessas exageradas e sem preço.",
  "Destaques: 3 a 5 itens curtos e objetivos.",
].join(" ");

function buildBriefing(data: z.infer<typeof InputSchema>) {
  const rows: Array<[string, string]> = [
    ["Categoria", data.category],
    ["Marca", data.brand],
    ["Modelo", data.model],
    ["Ano", data.year],
    ["Horas de uso", data.hours],
    ["Condição", data.condition],
    ["Cidade", data.city],
    ["UF", data.state],
    ["Preço pedido", data.price],
    ["Observações brutas do vendedor", data.notes],
  ];
  const known = rows.filter(([, value]) => value && value.trim().length > 0);
  return [
    "Dados informados pelo vendedor:",
    ...known.map(([label, value]) => `- ${label}: ${value.trim()}`),
    known.length === 0 ? "- (nenhum dado textual informado)" : "",
    data.images.length
      ? `Foram enviadas ${data.images.length} foto(s) do equipamento. Descreva somente o que for visível nelas.`
      : "Nenhuma foto enviada.",
    "Gere o anúncio em json.",
  ]
    .filter(Boolean)
    .join("\n");
}

const RESPONSE_FORMAT = {
  type: "json_schema" as const,
  name: "listing_copy",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      highlights: { type: "array", items: { type: "string" } },
    },
    required: ["title", "description", "highlights"],
  },
};

/** Cota por membro: gerações nas últimas 24 horas. */
export const AI_DAILY_LIMIT = 30;
const AI_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Tempo máximo esperando o gateway antes de desistir. */
const AI_TIMEOUT_MS = 60_000;

export const generateListingCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }): Promise<ListingCopy> => {
    // 1) Só membro aprovado (vendedor) ou admin usa o gerador. O anúncio ainda não existe
    //    na tela de publicação, então a permissão é verificada no membro.
    const [{ data: profile, error: profileError }, { data: isAdmin, error: adminError }] =
      await Promise.all([
        context.supabase
          .from("profiles")
          .select("status, role")
          .eq("id", context.userId)
          .maybeSingle(),
        context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      ]);
    if (profileError || adminError) throw new Error("Não foi possível verificar sua permissão.");
    const canUse =
      Boolean(isAdmin) || (profile?.status === "approved" && profile.role === "seller");
    if (!canUse)
      throw new Error("A geração por IA está disponível apenas para vendedores aprovados.");

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("A geração por IA não está configurada.");

    // 2) Cota diária. O registro é feito com service role, antes da chamada, para que
    //    falhas do gateway também contem (evita abuso por tentativas repetidas).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - AI_WINDOW_MS).toISOString();
    const { count, error: countError } = await supabaseAdmin
      .from("ai_usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .gte("created_at", since);
    if (countError) throw new Error("Não foi possível verificar a cota de uso.");
    if ((count ?? 0) >= AI_DAILY_LIMIT) {
      throw new Error(
        `Limite de ${AI_DAILY_LIMIT} gerações em 24 horas atingido. Tente novamente mais tarde.`,
      );
    }
    const { error: insertError } = await supabaseAdmin
      .from("ai_usage_events")
      .insert({ user_id: context.userId, kind: "listing_copy" });
    if (insertError) throw new Error("Não foi possível registrar o uso da IA.");

    const content: Array<Record<string, unknown>> = [
      { type: "input_text", text: buildBriefing(data) },
      ...data.images.map((url) => ({ type: "input_image", image_url: url })),
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        instructions: SYSTEM,
        input: [{ role: "user", content }],
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        store: false,
        text: { format: RESPONSE_FORMAT },
      }),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    }).catch((error: unknown) => {
      console.error("AI gateway unreachable", error);
      throw new Error("A geração demorou demais. Tente novamente.");
    });

    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => "");
      if (response.status === 429) {
        throw new Error("Muitas gerações ao mesmo tempo. Tente novamente em instantes.");
      }
      if (response.status === 402 || response.status === 403) {
        throw new Error("Os créditos de IA do espaço de trabalho acabaram ou estão bloqueados.");
      }
      console.error("AI gateway error", response.status, detail.slice(0, 500));
      throw new Error("Não foi possível gerar a descrição agora.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const event = JSON.parse(payload) as {
              type?: string;
              delta?: string;
              response?: { output_text?: string };
            };
            if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
              text += event.delta;
            } else if (event.type === "response.completed" && event.response?.output_text) {
              if (!text) text = event.response.output_text;
            }
          } catch {
            // frame parcial ou evento desconhecido: ignora
          }
        }
      }
    }

    const parsed = (() => {
      try {
        return JSON.parse(text) as Partial<ListingCopy>;
      } catch {
        return null;
      }
    })();

    if (!parsed?.description) {
      throw new Error("A IA não retornou uma descrição. Tente novamente.");
    }

    return {
      title: (parsed.title ?? "").slice(0, 120),
      description: parsed.description.slice(0, 2000),
      highlights: Array.isArray(parsed.highlights)
        ? parsed.highlights.filter((item) => typeof item === "string").slice(0, 6)
        : [],
    };
  });
