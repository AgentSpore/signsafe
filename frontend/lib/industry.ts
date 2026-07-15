export type Industry =
  | "restaurant"
  | "retail"
  | "office"
  | "medical"
  | "salon"
  | "fitness"
  | "warehouse"
  | "elder_care"
  | "medical_bill"
  | "employment"
  | "loan"
  | "purchase"
  | "service"
  | "insurance"
  | "auto_purchase"
  | "hoa"
  | "residential_lease"
  | "other";

export interface DocType {
  id: Industry;
  labelRu: string;
  labelEn: string;
  hintRu: string;
  hintEn: string;
}

/**
 * Presets removed from the RU v1 UI: they encode US law (Davis-Stirling/CC&R, FTC CARS,
 * itemized EOB disputes, US assisted-living) that has no Russian counterpart. The enum
 * values survive for stored analyses and the backend, which answers them with a typed
 * "режим не поддерживается" result rather than re-reading them under РФ law.
 */
export const DEPRECATED_INDUSTRIES: readonly Industry[] = [
  "hoa",
  "auto_purchase",
  "medical_bill",
  "elder_care",
];

export function isDeprecatedIndustry(industry: Industry | string | null | undefined): boolean {
  return DEPRECATED_INDUSTRIES.includes(industry as Industry);
}

// Cards offered in the RU v1 UI. residential_lease leads — it is the primary use case.
export const DOCUMENT_TYPES: DocType[] = [
  { id: "residential_lease", labelRu: "Договор найма жилья", labelEn: "Residential Lease", hintRu: "Глазами нанимателя", hintEn: "Tenant lens" },
  { id: "other", labelRu: "Любой документ", labelEn: "Any Document", hintRu: "AI разберётся сам", hintEn: "AI will figure it out" },
  { id: "employment", labelRu: "Трудовой договор", labelEn: "Employment", hintRu: "ТК РФ, NDA, увольнение", hintEn: "Labor, NDA, termination" },
  { id: "loan", labelRu: "Кредит / Займ", labelEn: "Loan / Credit", hintRu: "Банк, МФО, ипотека", hintEn: "Bank, mortgage, MFI" },
  { id: "purchase", labelRu: "Купля-продажа", labelEn: "Purchase", hintRu: "Недвижимость, авто", hintEn: "Real estate, auto" },
  { id: "service", labelRu: "Услуги / Подряд", labelEn: "Services", hintRu: "SaaS, ремонт, абонемент", hintEn: "SaaS, contract work" },
  { id: "insurance", labelRu: "Страхование", labelEn: "Insurance", hintRu: "ОСАГО, КАСКО, ДМС", hintEn: "Auto, health, life" },
  { id: "restaurant", labelRu: "Аренда коммерческая", labelEn: "Commercial Lease", hintRu: "Офис, магазин, склад", hintEn: "Office, retail, warehouse" },
];

export function isResidentialLease(industry: Industry | string | null): boolean {
  return industry === "residential_lease";
}

// Legacy compat
export const COMMERCIAL_INDUSTRIES = DOCUMENT_TYPES.filter(d =>
  ["restaurant", "retail", "office", "medical", "salon", "fitness", "warehouse", "other"].includes(d.id)
).map(d => ({ id: d.id, label: d.labelEn, hint: d.hintEn }));

export const INDUSTRIES = COMMERCIAL_INDUSTRIES;

export const ELDER_CARE_INDUSTRY = { id: "elder_care" as Industry, label: "Assisted Living", hint: "Senior care" };
export const MEDICAL_BILL_INDUSTRY = { id: "medical_bill" as Industry, label: "Medical Bill", hint: "Hospital bills" };

export function isElderCare(industry: Industry | string | null): boolean {
  return industry === "elder_care";
}

export function isMedicalBill(industry: Industry | string | null): boolean {
  return industry === "medical_bill";
}
