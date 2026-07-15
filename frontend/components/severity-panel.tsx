"use client";

import { deriveSeveritySummary, type AnalysisData, type SeveritySummary } from "@/lib/api";
import { useLocale } from "./locale-provider";

/**
 * Severity counts — the replacement for the removed 0-100 risk score.
 *
 * The score implied a precision a free model does not have (codex: false precision), so
 * RU v1 reports what was actually found: «Критичных: N, Спорных: M», plus how many clauses
 * the model declined to judge.
 */
export function SeverityPanel({ data }: { data: AnalysisData }) {
  const { t } = useLocale();
  // Older analyses in localStorage predate the backend's computed field.
  const summary: SeveritySummary = data.severity_summary ?? deriveSeveritySummary(data.risk_clauses);

  const rows: { label: string; count: number; color: string }[] = [
    { label: t("summary.critical"), count: summary.critical, color: "var(--color-risk-critical)" },
    { label: t("summary.disputable"), count: summary.disputable, color: "var(--color-risk-warning)" },
    { label: t("summary.info"), count: summary.info, color: "var(--color-ink-tertiary)" },
    { label: t("summary.abstained"), count: summary.abstained, color: "var(--color-accent-electric)" },
  ];

  return (
    <div className="border border-[var(--color-divider)] p-8 bg-[var(--color-bg-surface)]">
      <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-4">
        {t("summary.title")}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="font-display text-5xl leading-none" style={{ color: row.color }}>
              {row.count}
            </div>
            <div
              className="font-mono text-[10px] tracking-widest mt-1.5 leading-tight"
              style={{ color: row.color }}
            >
              {row.label}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 pt-4 border-t border-[var(--color-divider)] font-body text-xs text-[var(--color-ink-tertiary)] leading-relaxed">
        {t("summary.hint")}
      </p>
    </div>
  );
}

/**
 * Reliability notice — distinct from the legal disclaimer. This one is about the quality
 * of the tool (free model, may be wrong); the disclaimer is about it not being advice.
 */
export function ReliabilityBanner() {
  const { t } = useLocale();
  return (
    <div className="border border-[var(--color-accent-electric)] bg-[var(--color-bg-surface)] p-5">
      <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-accent-electric)] mb-2">
        ⚠ {t("reliability.title")}
      </div>
      <p className="font-body text-sm text-[var(--color-ink-primary)] leading-relaxed">
        {t("reliability.body")}
      </p>
    </div>
  );
}

/** What the local redactor masked before the text left for the AI provider (152-ФЗ). */
export function RedactionPanel({ categories }: { categories: string[] | undefined }) {
  const { t } = useLocale();
  if (!categories) return null;

  return (
    <div className="border border-[var(--color-divider)] bg-[var(--color-bg-surface)] p-6">
      <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-3">
        {t("redaction.title")}
      </div>

      {categories.length > 0 ? (
        <>
          <p className="font-body text-sm text-[var(--color-ink-secondary)] leading-relaxed mb-3">
            {t("redaction.body")}
          </p>
          <ul className="flex flex-wrap gap-2 mb-3">
            {categories.map((c) => (
              <li
                key={c}
                className="font-mono text-[10px] tracking-wider uppercase border border-[var(--color-accent-signal)] text-[var(--color-accent-signal)] px-2.5 py-1"
              >
                {c}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="font-body text-sm text-[var(--color-ink-secondary)] leading-relaxed mb-3">
          {t("redaction.none")}
        </p>
      )}

      <p className="font-body text-xs text-[var(--color-ink-tertiary)] leading-relaxed">
        {t("redaction.caveat")}
      </p>
    </div>
  );
}

/** OCR came out poorly — say so rather than presenting a confident read of garbage. */
export function OcrQualityBanner() {
  const { t } = useLocale();
  return (
    <div className="border border-[var(--color-risk-warning)] bg-[var(--color-bg-surface)] p-5">
      <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-risk-warning)] mb-2">
        {t("ocr.lowQuality.title")}
      </div>
      <p className="font-body text-sm text-[var(--color-ink-secondary)] leading-relaxed">
        {t("ocr.lowQuality.body")}
      </p>
    </div>
  );
}
