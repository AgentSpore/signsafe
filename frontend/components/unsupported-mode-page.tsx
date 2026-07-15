"use client";

import Link from "next/link";
import { useLocale } from "./locale-provider";
import { LocaleSwitcher } from "./locale-switcher";
import { SiteFooter } from "./site-footer";

/**
 * Landing screen for a route whose preset was retired in RU v1.
 *
 * These routes used to offer an upload box. Keeping it would be dishonest: the backend now
 * refuses the preset outright (typed `unsupported_mode`), so the box could only ever spin
 * and fail. The route stays reachable — old links, bookmarks and the PWA cache still point
 * here — but it explains the removal and sends the user to a supported category.
 */
export function UnsupportedModePage() {
  const { t } = useLocale();

  return (
    <main className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-ink-primary)]">
      <div className="fixed inset-0 grid-lines pointer-events-none opacity-40" />

      <header className="relative border-b border-[var(--color-divider)]">
        <div className="max-w-[1000px] mx-auto px-6 md:px-8 py-6 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 border-2 border-[var(--color-ink-primary)] flex items-center justify-center font-mono text-xs font-bold">
              §
            </div>
            <span className="font-mono text-sm tracking-widest uppercase">SignSafe</span>
          </Link>
          <LocaleSwitcher />
        </div>
      </header>

      <section className="relative max-w-[1000px] mx-auto px-6 md:px-8 py-20 md:py-32">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-accent-electric)] mb-4">
          {t("beta.version")}
        </div>

        <h1 className="font-display text-4xl md:text-6xl leading-[0.95] mb-6">
          {t("blocked.unsupported.title")}
        </h1>

        <p className="font-body text-lg leading-relaxed text-[var(--color-ink-secondary)] max-w-2xl mb-10">
          {t("blocked.unsupported.body")}
        </p>

        <Link
          href="/"
          className="inline-block bg-[var(--color-accent-signal)] text-[var(--color-bg-base)] px-8 py-5 font-mono text-sm tracking-widest uppercase font-semibold hover:bg-[var(--color-ink-primary)] transition-colors"
        >
          {t("blocked.back")}
        </Link>
      </section>

      <SiteFooter />
    </main>
  );
}
