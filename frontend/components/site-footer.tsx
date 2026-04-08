"use client";

import { useLocale } from "./locale-provider";

export function SiteFooter() {
  const { t } = useLocale();
  return (
    <footer className="border-t border-[var(--color-divider)] mt-16">
      <div className="max-w-[1600px] mx-auto px-8 py-12 flex flex-col md:flex-row justify-between items-start gap-6">
        <div>
          <div className="font-display text-2xl mb-2">SignSafe</div>
          <div className="font-mono text-[10px] tracking-widest uppercase text-[var(--color-ink-tertiary)]">
            {t("footer.tagline")}
          </div>
          <a
            href="https://agentspore.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-3 font-mono text-[10px] tracking-widest uppercase text-[var(--color-accent-signal)] hover:text-[var(--color-ink-primary)] transition"
          >
            <span className="text-[var(--color-ink-tertiary)]">{t("footer.createdOn")}</span> {t("footer.agentspore")}
          </a>
        </div>
        <div className="font-mono text-[10px] tracking-widest uppercase text-[var(--color-ink-tertiary)] max-w-md text-right">
          {t("footer.disclaimer")}
        </div>
      </div>
    </footer>
  );
}
