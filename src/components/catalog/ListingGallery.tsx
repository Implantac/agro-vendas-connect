import { useState } from "react";
import { ChevronLeft, ChevronRight, Expand, ImageOff, Images } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ListingGallery({
  media,
  title,
}: {
  media: { url: string; is_cover: boolean; sort_order: number }[];
  title: string;
}) {
  const photos = media
    .slice()
    .sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order);
  const [index, setIndex] = useState(0);
  const [full, setFull] = useState(false);
  const current = photos[index];

  const prev = () => setIndex((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setIndex((i) => (i + 1) % photos.length);

  if (!photos.length) {
    return (
      <div className="flex aspect-4/3 w-full flex-col items-center justify-center gap-2 rounded-md border border-border bg-secondary text-muted-foreground">
        <ImageOff className="h-8 w-8" />
        <span className="text-xs font-medium">Foto não disponível</span>
      </div>
    );
  }

  return (
    <div>
      <div className="group relative overflow-hidden rounded-md border border-border bg-card">
        <img
          src={current!.url}
          alt={`${title} — foto ${index + 1} de ${photos.length}`}
          className="aspect-4/3 w-full object-cover"
          width={1600}
          height={1200}
        />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-sm bg-background/90 px-2 py-1 text-[11px] font-semibold text-forest">
          <Images className="h-3.5 w-3.5" /> {index + 1}/{photos.length}
        </span>
        <Button
          size="sm"
          variant="secondary"
          className="absolute right-3 top-3 h-8 px-2"
          onClick={() => setFull(true)}
          aria-label="Ver em tela cheia"
        >
          <Expand className="h-4 w-4" />
        </Button>
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Foto anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/90 p-2 text-forest shadow opacity-0 transition group-hover:opacity-100 focus:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Próxima foto"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/90 p-2 text-forest shadow opacity-0 transition group-hover:opacity-100 focus:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {photos.map((m, i) => (
            <button
              key={m.url}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ver foto ${i + 1}`}
              className={cn(
                "shrink-0 overflow-hidden rounded-sm border-2 transition",
                i === index ? "border-accent" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <img
                src={m.url}
                alt=""
                loading="lazy"
                className="aspect-4/3 w-24 object-cover sm:w-28"
              />
            </button>
          ))}
        </div>
      )}

      <Dialog open={full} onOpenChange={setFull}>
        <DialogContent className="max-w-5xl border-0 bg-foreground/95 p-2 sm:p-4">
          <DialogTitle className="sr-only">Fotos de {title}</DialogTitle>
          <div className="relative">
            <img
              src={current!.url}
              alt={`${title} — foto ${index + 1}`}
              className="mx-auto max-h-[80vh] w-auto rounded-sm object-contain"
            />
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Foto anterior"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/90 p-2 text-forest"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Próxima foto"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/90 p-2 text-forest"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
            <p className="mt-2 text-center text-xs text-background/80">
              {index + 1} de {photos.length}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
