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
  if (locale === "en") return UI_EN;
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
    console.warn("UI translate failed, falling back to EN", e);
    return UI_EN;
  }
}

/** Translate analysis data content (summary, clauses, concerns) and cache per-locale. */
export async function translateAnalysis(
  data: AnalysisData & { id?: string },
  locale: Locale,
): Promise<AnalysisData> {
  if (locale === "en") return data;
  const docId = (data as { id?: string }).id;
  if (typeof window !== "undefined" && docId) {
    const cached = localStorage.getItem(DOC_CACHE_KEY(docId, locale));
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
  }

  // Flatten all translatable strings, keeping track of shape so we can reassemble.
  // We translate EVERYTHING including original_text quotes AND the full extracted
  // document pages — users want to read the contract in their language.
  const strings: string[] = [];
  strings.push(data.summary);
  data.top_3_concerns.forEach((c) => strings.push(c));
  data.risk_clauses.forEach((c) => {
    strings.push(c.title);
    strings.push(c.original_text);
    strings.push(c.plain_english);
    strings.push(c.why_risky);
    strings.push(c.negotiation_counter);
    strings.push(c.benchmark || "");
  });
  // Translate full document pages too (when available)
  const pages = data.extracted_pages || [];
  pages.forEach((p) => strings.push(p.text || ""));

  const translated = await apiTranslate(strings, locale);
  let idx = 0;
  const summary = translated[idx++];
  const top_3_concerns = data.top_3_concerns.map(() => translated[idx++]);
  const risk_clauses: RiskClause[] = data.risk_clauses.map((c) => ({
    ...c,
    title: translated[idx++],
    original_text: translated[idx++],
    plain_english: translated[idx++],
    why_risky: translated[idx++],
    negotiation_counter: translated[idx++],
    benchmark: translated[idx++] || null,
  }));
  const extracted_pages = pages.map((p) => ({
    page_number: p.page_number,
    text: translated[idx++] || p.text,
  }));

  const result: AnalysisData = {
    ...data,
    summary,
    top_3_concerns,
    risk_clauses,
    extracted_pages,
  };

  if (typeof window !== "undefined" && docId) {
    localStorage.setItem(DOC_CACHE_KEY(docId, locale), JSON.stringify(result));
  }
  return result;
}
