import { useQuery } from "@tanstack/react-query";
import { PublicLayout, PageHeader } from "@/components/layout/PublicLayout";
import { fetchLegalDocument } from "@/lib/queries";
import { formatDateBR } from "@/lib/format";

function renderMarkdown(md: string) {
  return md.split("\n").map((line, i) => {
    if (line.startsWith("### ")) {
      return (
        <h3 key={i} className="mt-8 font-display text-base font-semibold text-forest">
          {line.slice(4)}
        </h3>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <h2 key={i} className="mt-10 font-display text-xl font-bold text-forest">
          {line.slice(3)}
        </h2>
      );
    }
    if (!line.trim()) return null;
    return (
      <p key={i} className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {line}
      </p>
    );
  });
}

export function LegalPage({ docType, fallbackTitle }: { docType: string; fallbackTitle: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["legal", docType],
    queryFn: () => fetchLegalDocument(docType),
  });

  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Documento legal"
        title={data?.title ?? fallbackTitle}
        {...(data
          ? { description: `Versão ${data.version} — vigente desde ${formatDateBR(data.published_at)}` }
          : {})}
      />
      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando documento...</p>}
        {!isLoading && !data && (
          <p className="text-sm text-muted-foreground">
            Este documento ainda não foi publicado pela administração.
          </p>
        )}
        {data && renderMarkdown(data.content_md)}
      </article>
    </PublicLayout>
  );
}
