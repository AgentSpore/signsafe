"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { UI_EN, type Locale } from "@/lib/i18n";
import { loadUIStrings } from "@/lib/translate";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  loading: boolean;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "ru",
  setLocale: () => {},
  t: (k) => UI_EN[k] || k,
  loading: false,
});

const KEY = "signsafe:locale";

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ru");
  const [strings, setStrings] = useState<Record<string, string>>(UI_EN);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(KEY) as Locale | null;
    if (stored && stored !== "ru") setLocaleState(stored);
  }, []);

  useEffect(() => {
    if (locale === "ru") {
      setStrings(UI_EN);
      return;
    }
    setLoading(true);
    loadUIStrings(locale)
      .then(setStrings)
      .catch((e) => {
        console.error("UI translation failed", e);
        setStrings(UI_EN);
      })
      .finally(() => setLoading(false));
  }, [locale]);

  const setLocale = (l: Locale) => {
    localStorage.setItem(KEY, l);
    setLocaleState(l);
  };

  const t = (key: string) => strings[key] || UI_EN[key] || key;

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, loading }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
