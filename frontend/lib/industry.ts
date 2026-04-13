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
  | "other";

export interface DocType {
  id: Industry;
  labelRu: string;
  labelEn: string;
  hintRu: string;
  hintEn: string;
}

export const DOCUMENT_TYPES: DocType[] = [
  { id: "other", labelRu: "Любой документ", labelEn: "Any Document", hintRu: "AI разберётся сам", hintEn: "AI will figure it out" },
  { id: "employment", labelRu: "Трудовой договор", labelEn: "Employment", hintRu: "ТК РФ, NDA, увольнение", hintEn: "Labor, NDA, termination" },
  { id: "loan", labelRu: "Кредит / Займ", labelEn: "Loan / Credit", hintRu: "Банк, МФО, ипотека", hintEn: "Bank, mortgage, MFI" },
  { id: "purchase", labelRu: "Купля-продажа", labelEn: "Purchase", hintRu: "Недвижимость, авто", hintEn: "Real estate, auto" },
  { id: "service", labelRu: "Услуги / Подряд", labelEn: "Services", hintRu: "SaaS, ремонт, абонемент", hintEn: "SaaS, contract work" },
  { id: "insurance", labelRu: "Страхование", labelEn: "Insurance", hintRu: "ОСАГО, КАСКО, ДМС", hintEn: "Auto, health, life" },
  { id: "restaurant", labelRu: "Аренда", labelEn: "Lease", hintRu: "Офис, магазин, склад", hintEn: "Office, retail, warehouse" },
  { id: "elder_care", labelRu: "Дом престарелых", labelEn: "Elder Care", hintRu: "Договор на уход", hintEn: "Assisted living" },
  { id: "medical_bill", labelRu: "Мед. счёт", labelEn: "Medical Bill", hintRu: "Больница, клиника", hintEn: "Hospital, clinic" },
  { id: "auto_purchase", labelRu: "Покупка авто", labelEn: "Auto Purchase", hintRu: "Дилер, допы, кредит", hintEn: "Dealer, add-ons, loan" },
  { id: "hoa", labelRu: "ТСЖ / HOA", labelEn: "HOA / CC&R", hintRu: "Устав, взносы, штрафы", hintEn: "Rules, fees, fines" },
];

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
