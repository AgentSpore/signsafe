"use client";

import type { RiskClause } from "@/lib/api";

const SEVERITY_META: Record<number, { label: string; color: string; bar: string }> = {
  1: { label: "INFO", color: "var(--color-ink-tertiary)", bar: "w-1/5" },
  2: { label: "CAUTION", color: "var(--color-risk-caution)", bar: "w-2/5" },
  3: { label: "WARNING", color: "var(--color-risk-warning)", bar: "w-3/5" },
  4: { label: "CRITICAL", color: "var(--color-risk-critical)", bar: "w-4/5" },
  5: { label: "DEAL-BREAKER", color: "var(--color-risk-deal-breaker)", bar: "w-full" },
};

export function ClauseCard({
  clause,
  index,
  onJumpToPage,
}: {
  clause: RiskClause;
  index: number;
  onJumpToPage?: (page: number) => void;
}) {
  const meta = SEVERITY_META[clause.severity];
  const isCritical = clause.severity >= 4;

  return (
    <article
      className={`border border-[var(--color-divider)] bg-[var(--color-bg-surface)] p-6 ${
        isCritical ? "pulse-critical" : ""
      } ${onJumpToPage ? "cursor-pointer hover:border-[var(--color-accent-signal)]" : ""}`}
      style={isCritical ? { borderColor: meta.color } : undefined}
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
          {onJumpToPage ? "⇱ " : ""}PAGE {clause.page_number}
        </div>
      </div>

      {/* Severity bar */}
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

      {/* Original quote */}
      <blockquote className="border-l-2 border-[var(--color-ink-tertiary)] pl-4 py-1 mb-5">
        <div className="font-body italic text-[var(--color-ink-secondary)] text-sm leading-relaxed">
          &ldquo;{clause.original_text}&rdquo;
        </div>
      </blockquote>

      {/* Plain English */}
      <div className="mb-5">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-2">
          ─── IN PLAIN ENGLISH ───
        </div>
        <p className="font-body text-[var(--color-ink-primary)] leading-relaxed">
          {clause.plain_english}
        </p>
      </div>

      {/* Why risky */}
      <div className="mb-5">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-2">
          ─── WHY IT&rsquo;S RISKY ───
        </div>
        <p className="font-body text-[var(--color-ink-secondary)] leading-relaxed">
          {clause.why_risky}
        </p>
      </div>

      {/* Counter */}
      <div className="border border-[var(--color-accent-signal)] p-4 bg-[var(--color-bg-base)]">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-accent-signal)] mb-2">
          ─── COUNTER LANGUAGE ───
        </div>
        <p className="font-body text-[var(--color-ink-primary)] leading-relaxed">
          {clause.negotiation_counter}
        </p>
      </div>

      {clause.benchmark && (
        <div className="mt-4 font-mono text-[10px] text-[var(--color-ink-tertiary)] uppercase tracking-wider">
          BENCHMARK · {clause.benchmark}
        </div>
      )}
    </article>
  );
}
