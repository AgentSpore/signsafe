export type Industry =
  | "restaurant"
  | "retail"
  | "office"
  | "medical"
  | "salon"
  | "fitness"
  | "warehouse"
  | "other";

export const INDUSTRIES: { id: Industry; label: string; hint: string }[] = [
  { id: "restaurant", label: "Restaurant", hint: "Food service, cafes, bars" },
  { id: "retail", label: "Retail", hint: "Stores, boutiques, showrooms" },
  { id: "office", label: "Office", hint: "Coworking, SaaS, agencies" },
  { id: "medical", label: "Medical", hint: "Clinics, dental, therapy" },
  { id: "salon", label: "Salon", hint: "Beauty, barbers, nails" },
  { id: "fitness", label: "Fitness", hint: "Gyms, studios, yoga" },
  { id: "warehouse", label: "Warehouse", hint: "Industrial, logistics" },
  { id: "other", label: "Other", hint: "General commercial" },
];
