"use client";

export type Locale = "en" | "ru" | "zh" | "es" | "de" | "fr";

export const LOCALES: { code: Locale; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "ru", label: "Russian", native: "Русский" },
  { code: "zh", label: "Chinese", native: "中文" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "fr", label: "French", native: "Français" },
];

// UI strings (authored in EN, translated on demand via API)
export const UI_EN: Record<string, string> = {
  "nav.how": "How it works",
  "nav.patterns": "Patterns",
  "nav.history": "History",
  "hero.heading": "FIRST LEASE? DON'T SIGN BLIND.",
  "hero.lead":
    "Commercial leases hide $40K traps in 80-page boilerplate. Unlimited guarantees, holdover double-rent, relocation clauses that move you into a closet. We find them in ≈25 seconds.",
  "hero.whatWeFind": "WHAT WE FIND",
  "hero.unlimitedGuarantees": "Unlimited personal guarantees",
  "hero.holdover": "200% holdover penalties",
  "hero.cam": "Uncapped CAM pass-through",
  "hero.acceleration": "Rent acceleration on default",
  "hero.autoRenewal": "Auto-renewal traps",
  "upload.step": "STEP 02 / UPLOAD",
  "upload.drop": "Drop your lease PDF.",
  "upload.limits": "Up to 10MB · processed in memory · never stored on server.",
  "upload.select": "SELECT FILE →",
  "upload.uploading": "Uploading…",
  "upload.analyzing": "Running forensics…",
  "upload.extracting": "Reading your PDF…",
  "demo.try": "TRY LIVE DEMO (NO UPLOAD) →",
  "industry.label": "STEP 01 / INDUSTRY (optional, improves accuracy)",
  "how.title": "Three steps. Zero data retention. One clear verdict.",
  "how.extract": "Extract",
  "how.extractBody": "PyMuPDF parses every page. Your file lives in RAM for seconds, then is discarded.",
  "how.forensics": "Forensics",
  "how.forensicsBody": "Free open-source LLMs cross-reference 40 predatory patterns against your exact text.",
  "how.verdict": "Verdict",
  "how.verdictBody": "Risk score, recommendation, counter-language. Saved to your browser only.",
  "scale.title": "We don't sugarcoat. Red means red.",
  "analysis.summary": "EXECUTIVE SUMMARY",
  "analysis.top3": "TOP 3 CONCERNS",
  "analysis.flagged": "FLAGGED CLAUSES",
  "analysis.riskScore": "OVERALL RISK SCORE",
  "analysis.breakdown": "CLAUSE BREAKDOWN",
  "analysis.negotiate": "DRAFT NEGOTIATION EMAIL",
  "analysis.exportPdf": "⬇ EXPORT PDF REPORT",
  "analysis.share": "⧉ SHARE LINK",
  "analysis.another": "← ANALYZE ANOTHER LEASE",
  "clause.plainEnglish": "─── IN PLAIN ENGLISH ───",
  "clause.whyRisky": "─── WHY IT'S RISKY ───",
  "clause.counter": "─── COUNTER LANGUAGE ───",
  "history.title": "Your archive.",
  "history.empty": "No analyses yet. Upload a lease to get started.",
  "history.clearAll": "CLEAR ALL",
  "history.open": "OPEN",
};

export function uiStringsList(): { keys: string[]; values: string[] } {
  const keys = Object.keys(UI_EN);
  return { keys, values: keys.map((k) => UI_EN[k]) };
}
