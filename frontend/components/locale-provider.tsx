"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { UI_EN, type Locale } from "@/lib/i18n";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  loading: boolean;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {},
  t: (k) => UI_EN[k] || k,
  loading: false,
});

const KEY = "signsafe:locale";

// Note: UI labels stay in English regardless of locale.
// Only analysis CONTENT is translated (via translateAnalysis on the analyze view).
// This avoids parallel translate calls hitting LLM rate limits and keeps UI snappy.
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = localStorage.getItem(KEY) as Locale | null;
    if (stored && stored !== "en") setLocaleState(stored);
  }, []);

  const setLocale = (l: Locale) => {
    localStorage.setItem(KEY, l);
    setLocaleState(l);
  };

  const t = (key: string) => UI_EN[key] || key;

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, loading: false }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
