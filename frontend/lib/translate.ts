"use client";

import type { AnalysisData, RiskClause } from "./api";
import type { Locale } from "./i18n";
import { UI_EN, uiStringsList } from "./i18n";

// v2: bumped when translation shape changed (added original_text + extracted_pages).
// Old v1 caches are ignored by loading with a version suffix.
const CACHE_VERSION = "v2";
const UI_CACHE_KEY = (locale: Locale) => `signsafe:ui:${locale}:${CACHE_VERSION}`;
const DOC_CACHE_KEY = (id: string, locale: Locale) =>
  `signsafe:doc:${id}:${locale}:${CACHE_VERSION}`;

async function apiTranslate(items: string[], target: Locale): Promise<string[]> {
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target_locale: target, items }),
  });
  if (!res.ok) throw new Error(`Translate failed: ${res.status}`);
  const data = (await res.json()) as { items: string[] };
  return data.items;
}

export async function loadUIStrings(locale: Locale): Promise<Record<string, string>> {
  if (locale === "ru") return UI_EN;
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(UI_CACHE_KEY(locale));
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
  }
  const { keys, values } = uiStringsList();
  try {
    const translated = await apiTranslate(values, locale);
    const map: Record<string, string> = {};
    keys.forEach((k, i) => (map[k] = translated[i] || UI_EN[k]));
    if (typeof window !== "undefined") {
      localStorage.setItem(UI_CACHE_KEY(locale), JSON.stringify(map));
    }
    return map;
  } catch (e) {
    console.warn("UI translate failed, falling back to RU", e);
    return UI_EN;
  }
}

/** Translate analysis data content (summary, clauses, concerns) and cache per-locale. */
export async function translateAnalysis(
  data: AnalysisData & { id?: string },
  locale: Locale,
): Promise<AnalysisData> {
  if (locale === "ru") return data;
  const docId = (data as { id?: string }).id;
  if (typeof window !== "undefined" && docId) {
    const cached = localStorage.getItem(DOC_CACHE_KEY(docId, locale));
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
  }

  // PRIVACY INVARIANT — user document content is NEVER sent to the translation service.
  //
  // Translation egresses to Google Translate (a third party, see
  // src/signsafe/services/outbound.py). We therefore translate ONLY model-derived
  // analysis prose, which the model produced from already-redacted input.
  //
  // Deliberately NOT translated (they are the user's document, not our commentary):
  //   * extracted_pages[].text — the raw contract as extracted, unredacted.
  //   * risk_clauses[].original_text — a verbatim quote from the contract.
  // Both are rendered in the original language; the UI notes they stay untranslated.
  const strings: string[] = [];
  strings.push(data.summary);
  data.top_3_concerns.forEach((c) => strings.push(c));
  data.risk_clauses.forEach((c) => {
    strings.push(c.title);
    strings.push(c.plain_english);
    strings.push(c.why_risky);
    strings.push(c.negotiation_counter);
    strings.push(c.benchmark || "");
  });

  const translated = await apiTranslate(strings, locale);
  let idx = 0;
  const summary = translated[idx++];
  const top_3_concerns = data.top_3_concerns.map(() => translated[idx++]);
  const risk_clauses: RiskClause[] = data.risk_clauses.map((c) => ({
    ...c,
    title: translated[idx++],
    // original_text intentionally preserved as-is — never leaves for translation.
    original_text: c.original_text,
    plain_english: translated[idx++],
    why_risky: translated[idx++],
    negotiation_counter: translated[idx++],
    benchmark: translated[idx++] || null,
  }));

  const result: AnalysisData = {
    ...data,
    summary,
    top_3_concerns,
    risk_clauses,
    // extracted_pages passed through untouched — the raw document is never translated.
    extracted_pages: data.extracted_pages,
  };

  if (typeof window !== "undefined" && docId) {
    localStorage.setItem(DOC_CACHE_KEY(docId, locale), JSON.stringify(result));
  }
  return result;
}
