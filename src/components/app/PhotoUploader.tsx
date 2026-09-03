import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoUploaderProps {
  files: File[];
  onChange: (files: File[]) => void;
  max?: number;
  className?: string;
}

/** Seleção de fotos com pré-visualização em tamanho padrão (4:3). */
export function PhotoUploader({ files, onChange, max = 12, className }: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  function add(list: FileList | null) {
    if (!list?.length) return;
    const images = Array.from(list).filter((f) => f.type.startsWith("image/"));
    onChange([...files, ...images].slice(0, max));
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={className}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          add(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          dragging ? "border-accent bg-secondary/60" : "border-border hover:border-accent/60",
        )}
      >
        <ImagePlus className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium text-forest">
          Arraste as fotos do implemento ou clique para selecionar
        </p>
        <p className="text-xs text-muted-foreground">
          JPG, PNG ou WEBP • até {max} fotos • recortamos tudo para o padrão 4:3 da plataforma
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => add(e.target.files)}
      />

      {files.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {previews.map((src, i) => (
            <div
              key={src}
              className="group relative aspect-4/3 overflow-hidden rounded-md border border-border bg-secondary"
            >
              <img src={src} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded-sm bg-forest/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                  Capa
                </span>
              )}
              <button
                type="button"
                aria-label={`Remover foto ${i + 1}`}
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                className="absolute right-1.5 top-1.5 rounded-full bg-background/90 p-1 text-destructive shadow-sm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
