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

// All user-visible UI strings authored in EN.
// On locale switch, the entire dict is translated via Google Translate API (batch)
// and cached in localStorage per locale.
export const UI_EN: Record<string, string> = {
  // Navigation
  "nav.how": "How it works",
  "nav.patterns": "Patterns",
  "nav.history": "History",
  "nav.elderCare": "Assisted Living",
  "nav.commercial": "Commercial Lease",

  // Hero (home page)
  "hero.meta.vol": "VOL. 01 / 2026",
  "hero.meta.label": "LEASE FORENSICS",
  "hero.meta.for": "FOR FIRST-TIME COMMERCIAL TENANTS",
  "hero.stats.label": "STATS",
  "hero.stats.body": "PREDATORY PATTERNS DETECTED",
  "hero.privacy.label": "PRIVACY",
  "hero.privacy.body":
    "Stateless. Your PDF is analyzed in memory and discarded. Results stored only in your browser.",
  "hero.heading.line1": "FIRST LEASE?",
  "hero.heading.dont": "DON'T",
  "hero.heading.line2": "SIGN",
  "hero.heading.line3": "BLIND.",
  "hero.lead":
    "Commercial leases hide $40K traps in 80-page boilerplate. Unlimited guarantees, holdover double-rent, relocation clauses that move you into a closet. We find them in",
  "hero.lead.time": "≈25 SEC",
  "hero.whatWeFind": "WHAT WE FIND",
  "hero.find.guarantees": "Unlimited personal guarantees",
  "hero.find.holdover": "200% holdover penalties",
  "hero.find.cam": "Uncapped CAM pass-through",
  "hero.find.acceleration": "Rent acceleration on default",
  "hero.find.autoRenewal": "Auto-renewal traps",

  // Upload section
  "industry.label": "STEP 01 / INDUSTRY (optional, improves accuracy)",
  "industry.restaurant": "Restaurant",
  "industry.restaurant.hint": "Food service, cafes, bars",
  "industry.retail": "Retail",
  "industry.retail.hint": "Stores, boutiques, showrooms",
  "industry.office": "Office",
  "industry.office.hint": "Coworking, SaaS, agencies",
  "industry.medical": "Medical",
  "industry.medical.hint": "Clinics, dental, therapy",
  "industry.salon": "Salon",
  "industry.salon.hint": "Beauty, barbers, nails",
  "industry.fitness": "Fitness",
  "industry.fitness.hint": "Gyms, studios, yoga",
  "industry.warehouse": "Warehouse",
  "industry.warehouse.hint": "Industrial, logistics",
  "industry.elder_care": "Assisted Living",
  "industry.elder_care.hint": "Senior care, memory care, CCRC",
  "industry.other": "Other",
  "industry.other.hint": "General commercial",

  "upload.step": "STEP 02 / UPLOAD",
  "upload.drop": "Drop your lease PDF.",
  "upload.limits": "Up to 10MB · processed in memory · never stored on server.",
  "upload.select": "SELECT FILE →",
  "upload.uploading": "Uploading…",
  "upload.analyzing": "Running forensics…",
  "upload.extracting": "Reading your PDF…",
  "upload.stage": "STAGE",
  "upload.timeHint": "USUALLY TAKES 20-30 SECONDS",
  "upload.whatToExpect": "WHAT HAPPENS NEXT",
  "upload.step1": "PDF parsed in memory (no server storage)",
  "upload.step2": "LLM cross-references 74 predatory patterns",
  "upload.step3": "You get a risk score + negotiation counter-language",

  "demo.try": "TRY LIVE DEMO (NO UPLOAD) →",

  // How it works
  "how.section": "§ 02 / HOW IT WORKS",
  "how.title": "Three steps. Zero data retention. One clear verdict.",
  "how.stage": "STAGE",
  "how.extract": "Extract",
  "how.extractBody":
    "PyMuPDF parses every page. Your file lives in RAM for seconds, then is discarded.",
  "how.forensics": "Forensics",
  "how.forensicsBody":
    "Free open-source LLMs cross-reference 40 predatory patterns against your exact text.",
  "how.verdict": "Verdict",
  "how.verdictBody":
    "Risk score, recommendation, counter-language. Saved to your browser only.",

  // Severity scale
  "scale.section": "§ 03 / SEVERITY SCALE",
  "scale.title": "We don't sugarcoat. Red means red.",
  "scale.info": "INFO",
  "scale.info.desc": "Informational — standard clause, no action needed.",
  "scale.caution": "CAUTION",
  "scale.caution.desc": "Worth discussing — minor friction, usually fixable.",
  "scale.warning": "WARNING",
  "scale.warning.desc": "Meaningful risk — negotiate before signing.",
  "scale.critical": "CRITICAL",
  "scale.critical.desc": "Red flag — refuse without amendment.",
  "scale.dealBreaker": "DEAL-BREAKER",
  "scale.dealBreaker.desc": "Do not sign as-is. Walk away if landlord won't budge.",

  // Analysis view
  "analysis.underReview": "UNDER REVIEW",
  "analysis.pages": "PAGES",
  "analysis.clausesFlagged": "CLAUSES FLAGGED",
  "analysis.summary": "EXECUTIVE SUMMARY",
  "analysis.translating": "TRANSLATING...",
  "analysis.top3": "TOP 3 CONCERNS",
  "analysis.flagged": "FLAGGED CLAUSES",
  "analysis.noClauses": "No predatory clauses detected.",
  "analysis.riskScore": "OVERALL RISK SCORE",
  "analysis.breakdown": "CLAUSE BREAKDOWN",
  "analysis.another": "← ANALYZE ANOTHER LEASE",
  "analysis.showPreview": "⧉ SHOW PDF PREVIEW",
  "analysis.hidePreview": "✕ HIDE PREVIEW",
  "analysis.retry": "⟳ RETRY",
  "analysis.docText": "DOCUMENT TEXT (TRANSLATED)",
  "analysis.page": "PAGE",

  // Recommendation labels
  "rec.safe": "SAFE TO SIGN",
  "rec.safeBody": "Clean enough. Review highlighted notes then proceed.",
  "rec.negotiate": "NEGOTIATE FIRST",
  "rec.negotiateBody":
    "Meaningful risks found. Push back with counter-language before signing.",
  "rec.walkAway": "WALK AWAY",
  "rec.walkAwayBody": "Deal-breakers present. Do not sign as-is.",

  // Clause card
  "clause.plainEnglish": "IN PLAIN ENGLISH",
  "clause.whyRisky": "WHY IT'S RISKY",
  "clause.counter": "COUNTER LANGUAGE",
  "clause.benchmark": "BENCHMARK",

  // Negotiation panel
  "negotiation.draft": "⚡ DRAFT NEGOTIATION EMAIL",
  "negotiation.clauses": "clauses",
  "negotiation.professional": "professional",
  "negotiation.firm": "firm",
  "negotiation.friendly": "friendly",
  "negotiation.generating": "GENERATING…",
  "negotiation.regenerate": "REGENERATE",
  "negotiation.generate": "GENERATE EMAIL",
  "negotiation.subject": "SUBJECT",
  "negotiation.body": "BODY",
  "negotiation.copy": "⧉ COPY TO CLIPBOARD",

  // Share + Export
  "share.link": "⧉ SHARE LINK",
  "share.copied": "✓ LINK COPIED",
  "export.pdf": "⬇ EXPORT PDF REPORT",
  "export.generating": "GENERATING…",

  // History page
  "history.section": "§ LOCAL HISTORY",
  "history.title": "Your archive.",
  "history.empty.label": "EMPTY",
  "history.empty.body": "No analyses yet. Upload a lease to get started.",
  "history.empty.cta": "UPLOAD LEASE →",
  "history.clearAll": "CLEAR ALL",
  "history.open": "OPEN",
  "history.newAnalysis": "← NEW ANALYSIS",

  // Sync panel
  "sync.active": "✓ CLOUD SYNC ACTIVE",
  "sync.title": "─── CLOUD SYNC (E2E ENCRYPTED) ───",
  "sync.intro":
    "Link your email to sync analyses across devices. Data is encrypted in your browser — we store only ciphertext.",
  "sync.linkEmail": "⧉ LINK EMAIL",
  "sync.emailPlaceholder": "you@example.com",
  "sync.sending": "SENDING...",
  "sync.sendLink": "SEND MAGIC LINK →",
  "sync.devMode": "DEV MODE · TOKEN",
  "sync.useToken": "USE THIS TOKEN →",
  "sync.tokenPlaceholder": "paste magic token...",
  "sync.verify": "VERIFY TOKEN",
  "sync.now": "⟳ SYNC NOW",
  "sync.signOut": "SIGN OUT",
  "sync.emailSent": "Magic link sent — check your email",

  // Footer
  "footer.tagline": "LEASE FORENSICS · 2026 · STATELESS",
  "footer.createdOn": "CREATED ON",
  "footer.agentspore": "AGENTSPORE ↗",
  "footer.disclaimer":
    "EDUCATIONAL TOOL · NOT LEGAL ADVICE · CONSULT A LICENSED ATTORNEY FOR CRITICAL DECISIONS",

  // Home page path switcher
  "home.pathSwitcher.label": "WHAT ARE YOU REVIEWING?",
  "home.pathSwitcher.lease": "Commercial Lease",
  "home.pathSwitcher.leaseHint": "First business location — restaurant, shop, office, gym.",
  "home.pathSwitcher.elder": "Assisted Living Contract",
  "home.pathSwitcher.elderHint": "Moving a parent into senior care — read every clause first.",
  "home.pathSwitcher.cta": "SWITCH →",

  // Elder care landing page
  "elder.meta.label": "ELDER CARE FORENSICS",
  "elder.meta.vol": "VOL. 01 / 2026",
  "elder.meta.for": "FOR FAMILIES PLACING A PARENT",
  "elder.stats.body": "ELDER CARE TRAPS DETECTED",
  "elder.privacy.body":
    "Stateless. Your contract is analyzed in memory and discarded. Results saved only in your browser.",
  "elder.heading.line1": "MOM NEEDS",
  "elder.heading.dont": "DON'T",
  "elder.heading.line2": "CARE.",
  "elder.heading.line3": "SIGN BLIND.",
  "elder.lead":
    "Assisted living contracts hide $40k fee escalations behind friendly tours. Care level jumps, forced med management, arbitration waivers for neglect. We find them in",
  "elder.whatWeFind": "WHAT WE FIND",
  "elder.find.careEscalation": "Unilateral care level hikes",
  "elder.find.communityFee": "Non-refundable entrance fees",
  "elder.find.arbitration": "Neglect / abuse arbitration waivers",
  "elder.find.medicaid": "Medicaid spend-down evictions",
  "elder.find.responsibleParty": "Adult child personal guaranty",
  "elder.upload.drop": "Drop your assisted living contract PDF.",
  "elder.upload.limits": "Up to 10MB · processed in memory · never stored on server.",
  "elder.cta.backToCommercial": "← BACK TO COMMERCIAL LEASE",

  // How it works — shared elder copy
  "elder.how.title": "Three steps. Zero data retention. One clear verdict for your family.",
  "elder.how.extractBody":
    "We parse every page of the residency agreement, care plan addendum, and fee schedules.",
  "elder.how.forensicsBody":
    "Free open-source LLMs cross-reference 34 elder care traps against your exact contract.",
  "elder.how.verdictBody":
    "Risk score, plain-English explanations, questions to ask the director. Saved to your browser only.",

  // Elder-specific severity descriptions
  "elder.scale.dealBreakerDesc":
    "Walk away. Find a different facility. This clause will hurt your parent.",
  "elder.scale.criticalDesc":
    "Red flag. Require amendment before move-in day.",

  // 404 / not found
  "notFound.header": "ERROR 404 / NOT IN LOCAL STORAGE",
  "notFound.title": "Not found.",
  "notFound.body":
    "This analysis is not stored in your browser. Results are saved locally only — if you cleared storage or opened another device, the data is gone.",
  "notFound.cta": "← UPLOAD NEW LEASE",
  "loading": "LOADING…",
  "shared.readOnly": "SHARED · READ-ONLY",
};

export function uiStringsList(): { keys: string[]; values: string[] } {
  const keys = Object.keys(UI_EN);
  return { keys, values: keys.map((k) => UI_EN[k]) };
}
