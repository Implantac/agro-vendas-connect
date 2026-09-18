import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generateListingCopy, type ListingCopy } from "@/lib/ai-listing.functions";
import { toCompactDataUrl } from "@/lib/image-normalize";

export interface AiBriefing {
  category: string;
  brand: string;
  model: string;
  year: string;
  hours: string;
  condition: string;
  city: string;
  state: string;
  price: string;
}

interface Props {
  briefing: AiBriefing;
  photos: File[];
  onApply: (copy: ListingCopy) => void;
}

/** Gera uma descrição padronizada do anúncio a partir das fotos e das informações brutas. */
export function AiDescriptionPanel({ briefing, photos, onApply }: Props) {
  const generate = useServerFn(generateListingCopy);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ListingCopy | null>(null);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const images = (
        await Promise.all(photos.slice(0, 3).map((file) => toCompactDataUrl(file)))
      ).filter((value): value is string => Boolean(value));

      const copy = await generate({ data: { ...briefing, notes, images } });
      setResult(copy);
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível gerar a descrição agora.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-dashed border-accent/50 bg-secondary/40 p-4">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <div>
          <p className="text-sm font-semibold text-forest">Gerar descrição com IA</p>
          <p className="text-xs text-muted-foreground">
            Escreva as informações do jeito que quiser e nós montamos uma descrição padronizada.
            {photos.length > 0
              ? ` ${Math.min(photos.length, 3)} foto(s) serão analisadas.`
              : " Envie fotos na etapa final para uma descrição ainda mais precisa."}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ai-notes" className="text-xs">
          Informações brutas
        </Label>
        <Textarea
          id="ai-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Ex.: pneus novos, revisão feita em janeiro, sempre guardada em galpão, acompanha concha."
        />
      </div>

      <Button type="button" variant="outline" onClick={run} disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando descrição...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" /> Gerar descrição
          </>
        )}
      </Button>

      {result && (
        <div className="space-y-3 rounded-lg border border-border bg-card p-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Título sugerido</p>
            <p className="text-sm font-semibold text-forest">{result.title}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Descrição sugerida</p>
            <p className="whitespace-pre-wrap text-sm text-forest">{result.description}</p>
          </div>
          {result.highlights.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-sm text-forest">
              {result.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            Revise o texto antes de publicar: você é responsável pelas informações do anúncio.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onApply(result);
                toast.success("Descrição aplicada ao anúncio.");
              }}
            >
              Usar esta descrição
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={run} disabled={loading}>
              Gerar outra
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
