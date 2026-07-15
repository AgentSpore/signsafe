"use client";

import Link from "next/link";
import { useLocale } from "./locale-provider";

/**
 * 152-ФЗ consent gate. Rendered above the drop zone, never collapsed into a
 * "By continuing you agree…" line: the user reads what leaves the browser, then ticks an
 * unchecked box. The backend independently requires `consent_version` on /api/analyze, so
 * this is the honest surface of a real gate rather than the gate itself.
 */
export function ConsentGate({
  accepted,
  onChange,
  showRequiredHint = false,
}: {
  accepted: boolean;
  onChange: (v: boolean) => void;
  showRequiredHint?: boolean;
}) {
  const { t } = useLocale();

  const points = [
    t("consent.operator"),
    t("consent.redaction"),
    t("consent.transfer"),
    t("consent.storage"),
    t("consent.authority"),
    t("consent.withdrawal"),
  ];

  return (
    <div className="border border-[var(--color-divider)] bg-[var(--color-bg-surface)] p-6 md:p-8">
      <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-accent-electric)] mb-3">
        {t("consent.title")}
      </div>

      <p className="font-body text-sm text-[var(--color-ink-primary)] leading-relaxed mb-4">
        {t("consent.intro")}
      </p>

      <ul className="space-y-2.5 mb-5">
        {points.map((point, i) => (
          <li key={i} className="flex gap-3 font-body text-sm text-[var(--color-ink-secondary)] leading-relaxed">
            <span aria-hidden className="text-[var(--color-ink-tertiary)] font-mono text-[10px] pt-1">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>{point}</span>
          </li>
        ))}
      </ul>

      <Link
        href="/privacy"
        className="inline-block mb-5 font-mono text-[10px] tracking-widest uppercase text-[var(--color-accent-signal)] underline decoration-dotted underline-offset-4 hover:text-[var(--color-ink-primary)] transition"
      >
        {t("consent.readPolicy")}
      </Link>

      <label className="flex gap-3 cursor-pointer items-start border-t border-[var(--color-divider)] pt-5">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => onChange(e.target.checked)}
          aria-describedby={showRequiredHint && !accepted ? "consent-required" : undefined}
          className="mt-1 w-5 h-5 shrink-0 accent-[var(--color-accent-signal)] cursor-pointer"
        />
        <span className="font-body text-sm text-[var(--color-ink-primary)] leading-relaxed">
          {t("consent.checkbox")}
        </span>
      </label>

      {showRequiredHint && !accepted && (
        <p
          id="consent-required"
          role="alert"
          className="mt-3 font-mono text-[10px] tracking-widest uppercase text-[var(--color-risk-critical)]"
        >
          {t("consent.required")}
        </p>
      )}
    </div>
  );
}
