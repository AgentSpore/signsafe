"use client";

import { useState } from "react";
import { LOCALES, type Locale } from "@/lib/i18n";
import { useLocale } from "./locale-provider";

export function LocaleSwitcher() {
  const { locale, setLocale, loading } = useLocale();
  const [open, setOpen] = useState(false);

  const current = LOCALES.find((l) => l.code === locale) || LOCALES[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="font-mono text-[10px] tracking-widest uppercase text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)] border border-[var(--color-divider)] px-3 py-1.5"
      >
        {loading ? "..." : current.native}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 min-w-[140px] bg-[var(--color-bg-surface)] border border-[var(--color-divider)] z-50">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLocale(l.code as Locale);
                setOpen(false);
              }}
              className={`w-full text-left font-mono text-[10px] tracking-widest uppercase px-3 py-2 hover:bg-[var(--color-bg-elevated)] ${
                l.code === locale ? "text-[var(--color-accent-signal)]" : "text-[var(--color-ink-secondary)]"
              }`}
            >
              {l.native}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
