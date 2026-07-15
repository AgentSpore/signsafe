"use client";

import type { Locale } from "./i18n";
import { UI_EN, uiStringsList } from "./i18n";

// v2: bumped when translation shape changed (added original_text + extracted_pages).
// Old v1 caches are ignored by loading with a version suffix.
const CACHE_VERSION = "v2";
const UI_CACHE_KEY = (locale: Locale) => `signsafe:ui:${locale}:${CACHE_VERSION}`;

/**
 * PRIVACY INVARIANT (RU v1 beta): nothing derived from the user's document is ever sent
 * to the translation service.
 *
 * `/api/translate` egresses to Google Translate — a third party beyond OpenRouter (see
 * src/signsafe/services/outbound.py). This module used to export `translateAnalysis`,
 * which sent model-derived analysis prose (summary, clause explanations) to Google
 * whenever a user switched to a non-RU locale. It is deleted, not disabled: the beta is
 * RU-first, non-RU results are out of scope, and a deleted function cannot be quietly put
 * back into service by a future caller who does not know the rule.
 *
 * What remains below translates ONLY `UI_EN` — our own static interface strings, authored
 * by us, containing no user content. The result view is RU-only and renders the analysis
 * exactly as the backend returned it.
 *
 * Net effect: the default RU path has zero Google egress, and no code path exists on
 * which document content reaches Google at all. The privacy copy states exactly this.
 */
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
