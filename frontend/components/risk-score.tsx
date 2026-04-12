"use client";

import { useEffect, useState } from "react";
import type { Recommendation } from "@/lib/api";
import { useLocale } from "./locale-provider";

export function RiskScore({
  score,
  recommendation,
}: {
  score: number;
  recommendation: Recommendation;
}) {
  const { t } = useLocale();
  const [display, setDisplay] = useState(0);
  const REC_META: Record<string, { label: string; color: string; body: string }> = {
    SAFE_TO_SIGN: {
      label: t("rec.safe"),
      color: "var(--color-accent-signal)",
      body: t("rec.safeBody"),
    },
    NEGOTIATE_FIRST: {
      label: t("rec.negotiate"),
      color: "var(--color-risk-warning)",
      body: t("rec.negotiateBody"),
    },
    WALK_AWAY: {
      label: t("rec.walkAway"),
      color: "var(--color-risk-deal-breaker)",
      body: t("rec.walkAwayBody"),
    },
    LOOKS_FAIR: {
      label: t("rec.fair"),
      color: "var(--color-accent-signal)",
      body: t("rec.fairBody"),
    },
    REVIEW_CAREFULLY: {
      label: t("rec.review"),
      color: "var(--color-risk-warning)",
      body: t("rec.reviewBody"),
    },
    DISPUTE_NOW: {
      label: t("rec.dispute"),
      color: "var(--color-risk-deal-breaker)",
      body: t("rec.disputeBody"),
    },
  };
  const meta = REC_META[recommendation] || REC_META.NEGOTIATE_FIRST;

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const duration = 1200;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * score));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  return (
    <div className="border border-[var(--color-divider)] p-8 bg-[var(--color-bg-surface)]">
      <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-3">
        {t("analysis.riskScore")}
      </div>
      <div className="flex items-baseline gap-3 mb-4">
        <div className="font-display text-8xl leading-none" style={{ color: meta.color }}>
          {display}
        </div>
        <div className="font-mono text-xl text-[var(--color-ink-tertiary)]">/100</div>
      </div>
      <div
        className="font-mono text-sm font-semibold tracking-widest mb-2"
        style={{ color: meta.color }}
      >
        → {meta.label}
      </div>
      <p className="font-body text-sm text-[var(--color-ink-secondary)] leading-relaxed">
        {meta.body}
      </p>
    </div>
  );
}
