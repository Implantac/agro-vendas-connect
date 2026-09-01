import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <section className="border-b border-border bg-secondary/60">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
        )}
        <h1 className="mt-3 max-w-3xl text-3xl font-bold text-forest sm:text-4xl">{title}</h1>
        {description && (
          <p className="mt-4 max-w-2xl text-base text-muted-foreground">{description}</p>
        )}
      </div>
    </section>
  );
}
