export type Industry =
  | "restaurant"
  | "retail"
  | "office"
  | "medical"
  | "salon"
  | "fitness"
  | "warehouse"
  | "elder_care"
  | "other";

export const COMMERCIAL_INDUSTRIES: { id: Industry; label: string; hint: string }[] = [
  { id: "restaurant", label: "Restaurant", hint: "Food service, cafes, bars" },
  { id: "retail", label: "Retail", hint: "Stores, boutiques, showrooms" },
  { id: "office", label: "Office", hint: "Coworking, SaaS, agencies" },
  { id: "medical", label: "Medical", hint: "Clinics, dental, therapy" },
  { id: "salon", label: "Salon", hint: "Beauty, barbers, nails" },
  { id: "fitness", label: "Fitness", hint: "Gyms, studios, yoga" },
  { id: "warehouse", label: "Warehouse", hint: "Industrial, logistics" },
  { id: "other", label: "Other", hint: "General commercial" },
];

// Backwards compat alias — home page still uses INDUSTRIES (commercial only).
export const INDUSTRIES = COMMERCIAL_INDUSTRIES;

export const ELDER_CARE_INDUSTRY: { id: Industry; label: string; hint: string } = {
  id: "elder_care",
  label: "Assisted Living",
  hint: "Senior care, memory care, CCRC",
};

export function isElderCare(industry: Industry | null): boolean {
  return industry === "elder_care";
}
