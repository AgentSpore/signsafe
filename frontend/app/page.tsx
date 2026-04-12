"use client";

import Link from "next/link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useLocale } from "@/components/locale-provider";
import { SiteFooter } from "@/components/site-footer";

export default function HubPage() {
  const { t } = useLocale();

  const cards = [
    {
      href: "/lease",
      label: t("hub.card.lease.label"),
      title: t("hub.card.lease.title"),
      hint: t("hub.card.lease.hint"),
      cta: t("hub.card.lease.cta"),
      count: "40",
      accent: "var(--color-accent-signal)",
    },
    {
      href: "/elder-care",
      label: t("hub.card.elder.label"),
      title: t("hub.card.elder.title"),
      hint: t("hub.card.elder.hint"),
      cta: t("hub.card.elder.cta"),
      count: "34",
      accent: "var(--color-accent-electric)",
    },
    {
      href: "/medical-bill",
      label: t("hub.card.medbill.label"),
      title: t("hub.card.medbill.title"),
      hint: t("hub.card.medbill.hint"),
      cta: t("hub.card.medbill.cta"),
      count: "25",
      accent: "var(--color-risk-warning)",
    },
  ];

  return (
    <main className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-ink-primary)]">
      <div className="fixed inset-0 grid-lines pointer-events-none opacity-40" />

      <header className="relative border-b border-[var(--color-divider)]">
        <div className="max-w-[1400px] mx-auto px-8 py-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 border-2 border-[var(--color-ink-primary)] flex items-center justify-center font-mono text-xs font-bold">
              §
            </div>
            <span className="font-mono text-sm tracking-widest uppercase">SignSafe</span>
          </Link>
          <nav className="flex items-center gap-6 font-mono text-xs tracking-widest uppercase text-[var(--color-ink-secondary)]">
            <Link href="/lease" className="hidden md:inline hover:text-[var(--color-ink-primary)] transition">
              {t("nav.commercial")}
            </Link>
            <Link href="/elder-care" className="hidden md:inline hover:text-[var(--color-ink-primary)] transition">
              {t("nav.elderCare")}
            </Link>
            <Link href="/medical-bill" className="hidden md:inline hover:text-[var(--color-ink-primary)] transition">
              {t("nav.medicalBill")}
            </Link>
            <Link href="/history" className="hover:text-[var(--color-ink-primary)] transition">
              {t("nav.history")}
            </Link>
            <LocaleSwitcher />
          </nav>
        </div>
      </header>

      <section className="relative max-w-[1400px] mx-auto px-8 pt-24 pb-16">
        <div className="grid grid-cols-12 gap-8">
          <aside className="col-span-12 md:col-span-3 space-y-8 reveal-up">
            <div>
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)]">
                {t("hub.meta.label")}
              </div>
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)]">
                {t("hub.meta.vol")}
              </div>
            </div>
            <div className="h-px bg-[var(--color-divider)]" />
            <div className="space-y-2">
              <div className="font-mono text-[10px] tracking-widest text-[var(--color-ink-tertiary)]">
                STATS
              </div>
              <div className="font-display text-4xl">{t("hub.stats.total")}</div>
              <div className="font-mono text-[10px] text-[var(--color-ink-secondary)]">
                {t("hub.stats.body")}
              </div>
            </div>
            <div className="h-px bg-[var(--color-divider)]" />
            <div className="space-y-2">
              <div className="font-mono text-[10px] tracking-widest text-[var(--color-ink-tertiary)]">
                PRIVACY
              </div>
              <div className="font-body text-xs text-[var(--color-ink-secondary)] leading-relaxed">
                {t("hero.privacy.body")}
              </div>
            </div>
          </aside>

          <div className="col-span-12 md:col-span-9">
            <h1 className="font-display font-normal text-[clamp(3.5rem,10vw,8.5rem)] leading-[0.88] tracking-[-0.035em] reveal-up">
              {t("hub.heading.line1")}<br />
              <span className="italic text-[var(--color-accent-signal)]">{t("hub.heading.line2")}</span><br />
              {t("hub.heading.line3")}
            </h1>

            <p className="mt-12 font-body text-xl md:text-2xl leading-relaxed text-[var(--color-ink-secondary)] max-w-2xl reveal-up">
              {t("hub.lead")}
            </p>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-px bg-[var(--color-divider)] reveal-up">
              {cards.map((card) => (
                <Link
                  key={card.href}
                  href={card.href}
                  className="bg-[var(--color-bg-base)] hover:bg-[var(--color-bg-surface)] transition-colors p-8 group"
                >
                  <div
                    className="font-mono text-[10px] tracking-[0.2em] uppercase mb-4"
                    style={{ color: card.accent }}
                  >
                    {card.label}
                  </div>
                  <div className="font-display text-3xl md:text-4xl mb-2">
                    {card.title}
                  </div>
                  <div className="font-body text-sm text-[var(--color-ink-secondary)] mb-6 leading-relaxed">
                    {card.hint}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="font-display text-5xl" style={{ color: card.accent }}>
                      {card.count}
                    </div>
                    <div
                      className="font-mono text-[10px] tracking-widest uppercase group-hover:translate-x-1 transition-transform"
                      style={{ color: card.accent }}
                    >
                      {card.cta}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-t border-[var(--color-divider)]">
        <div className="max-w-[1400px] mx-auto px-8 py-24">
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-4">
            § 02 / HOW IT WORKS
          </div>
          <h2 className="font-display text-5xl md:text-7xl leading-[0.9] mb-16 max-w-3xl">
            {t("how.title")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[var(--color-divider)]">
            {[
              { num: "01", title: t("how.extract"), body: "Upload any PDF — lease, care contract, or medical bill. Parsed in memory, never stored." },
              { num: "02", title: t("how.forensics"), body: "Free LLMs cross-reference 99 predatory patterns against your document text." },
              { num: "03", title: t("how.verdict"), body: "Risk score, plain-English explanations, counter-language or dispute letter. Browser-only." },
            ].map((s) => (
              <div key={s.num} className="bg-[var(--color-bg-base)] p-10">
                <div className="font-display text-7xl text-[var(--color-accent-electric)] mb-6">{s.num}</div>
                <div className="font-mono text-[10px] tracking-widest uppercase text-[var(--color-ink-tertiary)] mb-2">STAGE</div>
                <div className="font-display text-3xl mb-4">{s.title}</div>
                <div className="font-body text-[var(--color-ink-secondary)] leading-relaxed">{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
