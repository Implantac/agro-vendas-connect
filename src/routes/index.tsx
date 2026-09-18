import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { HomeHero, TrustStrip } from "@/components/home/HomeHero";
import { CatalogPreview } from "@/components/home/CatalogPreview";
import { PlansSection } from "@/components/home/PlansSection";
import {
  AudienceSections,
  DossierSection,
  FaqSection,
  FinalCta,
  HowItWorksSection,
  ProblemSection,
  SecuritySection,
} from "@/components/home/HomeSections";

const SITE_URL = "https://agro-vendas-connect.lovable.app";
const TITLE = "DDP AGRO | Marketplace privado de máquinas agrícolas usadas";
const DESCRIPTION =
  "Compre e venda tratores, colheitadeiras, plantadeiras, pulverizadores e implementos agrícolas usados em um ambiente privado de negociação.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: SITE_URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
  }),
  component: Index,
});

function Index() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  // Membro aprovado que já está logado entra direto no sistema.
  useEffect(() => {
    if (loading || !user) return;
    if (profile?.status === "approved") void navigate({ to: "/app", replace: true });
  }, [loading, user, profile?.status, navigate]);

  return (
    <PublicLayout>
      <HomeHero />
      <TrustStrip />
      <ProblemSection />
      <CatalogPreview />
      <DossierSection />
      <AudienceSections />
      <HowItWorksSection />
      <PlansSection />
      <SecuritySection />
      <FaqSection />
      <FinalCta />
    </PublicLayout>
  );
}
