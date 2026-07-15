"use client";

import Link from "next/link";
import { useLocale } from "@/components/locale-provider";
import { SiteFooter } from "@/components/site-footer";
import { CONSENT_VERSION } from "@/lib/api";

/**
 * Full privacy policy. Deliberately states the uncomfortable parts — cross-border transfer
 * to a foreign AI provider, best-effort (not guaranteed) redaction, free models with no
 * usage guarantees — because the consent it backs is worthless if the page oversells.
 * No "юрист проверил" / "гарантирует законность" claims anywhere.
 */
export default function PrivacyPage() {
  const { t } = useLocale();

  // §5 (what we store) and §9 (optional sync) each carry a caveat — the part of the truth
  // a reader would otherwise have to infer. Per-section so a future one can add its own
  // without a second rendering path.
  //
  // §4 no longer has one: it used to explain what the translation service received, and
  // the translate path has been removed entirely, so there is nothing left to caveat.
  // OpenRouter is now the only third party, which §4 states plainly.
  //
  // §9's caveat is the important one: the sync encryption key is derived from the user's
  // email, which we store next to the ciphertext, so we can technically decrypt it. That
  // is stated rather than dressed up as "zero-knowledge".
  const CAVEATS: Record<number, boolean> = { 5: true, 9: true };
  const sections = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({
    title: t(`privacy.s${n}.title`),
    body: t(`privacy.s${n}.body`),
    caveatTitle: CAVEATS[n] ? t(`privacy.s${n}.caveat.title`) : null,
    caveat: CAVEATS[n] ? t(`privacy.s${n}.caveat`) : null,
  }));

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
        </div>
      </header>

      <article className="relative max-w-[1000px] mx-auto px-6 md:px-8 py-16 md:py-24">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-4">
          {t("privacy.updated")} {CONSENT_VERSION} · {t("beta.badge")}
        </div>

        <h1 className="font-display text-4xl md:text-6xl leading-[0.95] mb-8">
          {t("privacy.title")}
        </h1>

        <p className="font-body text-lg md:text-xl leading-relaxed text-[var(--color-ink-secondary)] max-w-3xl mb-16">
          {t("privacy.intro")}
        </p>

        <div className="space-y-12">
          {sections.map((s) => (
            <section key={s.title} className="border-t border-[var(--color-divider)] pt-8">
              <h2 className="font-display text-2xl md:text-3xl mb-4 leading-tight">{s.title}</h2>
              <p className="font-body text-base leading-relaxed text-[var(--color-ink-secondary)] max-w-3xl">
                {s.body}
              </p>

              {/* The in-memory claim holds for accepted uploads only. An oversized file is
                  spooled before the size check can reject it, so §5 carries the caveat
                  rather than leaving the blanket claim to imply more than is true. */}
              {s.caveat && (
                <div className="mt-5 border-l-2 border-[var(--color-accent-electric)] pl-4 max-w-3xl">
                  <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-accent-electric)] mb-2">
                    {s.caveatTitle}
                  </div>
                  <p className="font-body text-sm leading-relaxed text-[var(--color-ink-tertiary)]">
                    {s.caveat}
                  </p>
                </div>
              )}
            </section>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-[var(--color-divider)]">
          <Link
            href="/"
            className="inline-block font-mono text-xs tracking-widest uppercase border border-[var(--color-divider)] px-6 py-4 text-[var(--color-ink-secondary)] hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-ink-primary)] transition"
          >
            {t("privacy.back")}
          </Link>
        </div>
      </article>

      <SiteFooter />
    </main>
  );
}
