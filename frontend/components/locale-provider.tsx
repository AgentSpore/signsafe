"use client";

import { createContext, useContext, type ReactNode } from "react";
import { UI_EN } from "@/lib/i18n";

/**
 * RU-only string provider for the beta.
 *
 * There is deliberately no locale switching and no translation round-trip: the previous
 * implementation shipped UI strings to Google Translate via our own public
 * `/api/translate` endpoint, which also accepted arbitrary caller text. That endpoint was
 * removed so the AI provider (z.ai) is the ONLY third party receiving anything (see
 * src/signsafe/services/outbound.py). `UI_EN` is already the RU source dictionary, so it
 * is rendered directly.
 *
 * The `useLocale()` / `t()` API is kept so call sites are unchanged; `t` is now a plain
 * synchronous dictionary lookup that cannot fail, load, or egress.
 */
interface LocaleContextValue {
  t: (key: string) => string;
}

const translate = (key: string) => UI_EN[key] || key;

const LocaleContext = createContext<LocaleContextValue>({ t: translate });

export function LocaleProvider({ children }: { children: ReactNode }) {
  return (
    <LocaleContext.Provider value={{ t: translate }}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
