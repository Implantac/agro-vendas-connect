/**
 * Indicadores de confiança — só aparecem quando existe validação real por trás.
 * Fonte única para página do anúncio, cards e perfil do vendedor.
 */
export interface TrustInput {
  sellerStatus?: string | null | undefined; // profiles.status
  sellerPhone?: string | null | undefined;
  companyVerification?: string | null | undefined; // seller_profiles.verification_status
  listingStatus?: string | null | undefined; // listings.status
  photos?: number | undefined;
  technical?: Record<string, unknown> | null | undefined;
  machineVerification?: string | null | undefined; // machines.verification_status
}

export interface TrustBadge {
  key: string;
  label: string;
  hint: string;
}

export function trustBadges(t: TrustInput): TrustBadge[] {
  const out: TrustBadge[] = [];
  if (t.sellerStatus === "approved")
    out.push({
      key: "seller",
      label: "Vendedor aprovado",
      hint: "Cadastro analisado e aprovado pela DDP AGRO.",
    });
  if (t.companyVerification === "approved")
    out.push({
      key: "company",
      label: "Empresa verificada",
      hint: "Dados da empresa conferidos pela equipe.",
    });
  if (t.sellerPhone && t.sellerPhone.replace(/\D/g, "").length >= 10)
    out.push({
      key: "phone",
      label: "Telefone informado",
      hint: "Telefone de contato cadastrado no perfil.",
    });
  if (t.listingStatus === "approved")
    out.push({
      key: "moderated",
      label: "Anúncio moderado",
      hint: "Conteúdo revisado pela moderação antes da publicação.",
    });
  if ((t.photos ?? 0) >= 3)
    out.push({
      key: "photos",
      label: "Fotos reais enviadas",
      hint: "Anúncio com 3 ou mais fotos padronizadas pela plataforma.",
    });
  if (t.machineVerification === "verified")
    out.push({
      key: "machine-docs",
      label: "Documentação verificada",
      hint: "CRLV, nota fiscal ou laudo conferidos pela equipe DDP AGRO.",
    });
  const doc = String(t.technical?.["documentacao"] ?? t.technical?.["Documentação"] ?? "").trim();
  if (doc && t.machineVerification !== "verified")
    out.push({
      key: "docs",
      label: "Documentação informada pelo vendedor",
      hint: `Declarado pelo vendedor, ainda sem conferência de documentos: ${doc}`,
    });
  return out;
}
