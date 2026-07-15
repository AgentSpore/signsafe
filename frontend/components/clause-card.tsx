"use client";

import { isAbstained, type RiskClause } from "@/lib/api";
import { useLocale } from "./locale-provider";

export function ClauseCard({
  clause,
  index,
  onJumpToPage,
}: {
  clause: RiskClause;
  index: number;
  onJumpToPage?: (page: number) => void;
}) {
  const { t } = useLocale();
  const SEVERITY_META: Record<number, { label: string; color: string; bar: string }> = {
    1: { label: t("scale.info"), color: "var(--color-ink-tertiary)", bar: "w-1/5" },
    2: { label: t("scale.caution"), color: "var(--color-risk-caution)", bar: "w-2/5" },
    3: { label: t("scale.warning"), color: "var(--color-risk-warning)", bar: "w-3/5" },
    4: { label: t("scale.critical"), color: "var(--color-risk-critical)", bar: "w-4/5" },
    5: { label: t("scale.dealBreaker"), color: "var(--color-risk-deal-breaker)", bar: "w-full" },
  };
  // Abstained clause: severity is null. Never fall back to a colour — showing a verdict
  // the model explicitly declined to give is exactly the dishonesty this layer removes.
  const abstained = isAbstained(clause);
  const meta = abstained ? null : SEVERITY_META[clause.severity as number];
  const isCritical = !abstained && (clause.severity as number) >= 4;
  const LEGALITY_META: Record<string, { label: string; color: string; emoji: string }> = {
    void: { label: t("legality.void"), color: "var(--color-risk-deal-breaker)", emoji: "🔴" },
    disputable: { label: t("legality.disputable"), color: "var(--color-risk-warning)", emoji: "🟠" },
    ok: { label: t("legality.ok"), color: "var(--color-risk-caution)", emoji: "🟢" },
  };
  const legality = clause.legality ? LEGALITY_META[clause.legality] : null;

  return (
    <article
      className={`border border-[var(--color-divider)] bg-[var(--color-bg-surface)] p-6 ${
        isCritical ? "pulse-critical" : ""
      } ${onJumpToPage ? "cursor-pointer hover:border-[var(--color-accent-signal)]" : ""}`}
      style={isCritical && meta ? { borderColor: meta.color } : undefined}
      onClick={() => onJumpToPage?.(clause.page_number)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)]">
            CLAUSE_{String(index + 1).padStart(2, "0")} / {clause.clause_type.toUpperCase()}
          </div>
          <h3 className="font-display text-2xl mt-1 leading-tight text-[var(--color-ink-primary)]">
            {clause.title}
          </h3>
        </div>
        <div className="font-mono text-[10px] text-[var(--color-ink-tertiary)] whitespace-nowrap">
          {onJumpToPage ? "⇱ " : ""}{t("analysis.page")} {clause.page_number}
        </div>
      </div>

      {/* Severity bar — or an explicit abstention notice when the model declined */}
      {meta ? (
        <div className="mb-6">
          <div className="h-1.5 bg-[var(--color-bg-elevated)] mb-1 overflow-hidden">
            <div className={`h-full ${meta.bar}`} style={{ background: meta.color }} />
          </div>
          <div
            className="font-mono text-[10px] tracking-widest font-semibold"
            style={{ color: meta.color }}
          >
            {meta.label}
          </div>
        </div>
      ) : (
        <div className="mb-6 border border-dashed border-[var(--color-accent-electric)] p-3">
          <div className="font-mono text-[10px] tracking-widest font-semibold text-[var(--color-accent-electric)] mb-1">
            {t("abstain.label")}
          </div>
          <p className="font-body text-sm text-[var(--color-ink-secondary)] leading-relaxed">
            {t("abstain.body")}
          </p>
        </div>
      )}

      {/* Legality classification (tenant profile only) */}
      {legality && (
        <div
          className="mb-5 border p-3"
          style={{ borderColor: legality.color, background: "var(--color-bg-base)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span aria-hidden>{legality.emoji}</span>
            <span
              className="font-mono text-[10px] tracking-[0.2em] uppercase font-semibold"
              style={{ color: legality.color }}
            >
              {legality.label}
            </span>
            {clause.norm_ref && (
              <span className="font-mono text-[10px] text-[var(--color-ink-tertiary)]">
                · {clause.norm_ref}
              </span>
            )}
          </div>
          {clause.legality_gloss && (
            <p className="font-body text-sm text-[var(--color-ink-secondary)] leading-relaxed">
              {clause.legality_gloss}
            </p>
          )}
        </div>
      )}

      {/* Original quote */}
      <blockquote className="border-l-2 border-[var(--color-ink-tertiary)] pl-4 py-1 mb-5">
        <div className="font-body italic text-[var(--color-ink-secondary)] text-sm leading-relaxed">
          &ldquo;{clause.original_text}&rdquo;
        </div>
      </blockquote>

      {/* Plain English */}
      <div className="mb-5">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-2">
          ─── {t("clause.plainEnglish")} ───
        </div>
        <p className="font-body text-[var(--color-ink-primary)] leading-relaxed">
          {clause.plain_english}
        </p>
      </div>

      {/* Why risky */}
      <div className="mb-5">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-2">
          ─── {t("clause.whyRisky")} ───
        </div>
        <p className="font-body text-[var(--color-ink-secondary)] leading-relaxed">
          {clause.why_risky}
        </p>
      </div>

      {/* Counter */}
      <div className="border border-[var(--color-accent-signal)] p-4 bg-[var(--color-bg-base)]">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-accent-signal)] mb-2">
          ─── {t("clause.counter")} ───
        </div>
        <p className="font-body text-[var(--color-ink-primary)] leading-relaxed">
          {clause.negotiation_counter}
        </p>
      </div>

      {clause.benchmark && (
        <div className="mt-4 font-mono text-[10px] text-[var(--color-ink-tertiary)] uppercase tracking-wider">
          {t("clause.benchmark")} · {clause.benchmark}
        </div>
      )}
    </article>
  );
}
