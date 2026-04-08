"use client";

import { useEffect, useState } from "react";
import type { Recommendation } from "@/lib/api";

const REC_META: Record<
  Recommendation,
  { label: string; color: string; body: string }
> = {
  SAFE_TO_SIGN: {
    label: "SAFE TO SIGN",
    color: "var(--color-accent-signal)",
    body: "Clean enough. Review highlighted notes then proceed.",
  },
  NEGOTIATE_FIRST: {
    label: "NEGOTIATE FIRST",
    color: "var(--color-risk-warning)",
    body: "Meaningful risks found. Push back with counter-language before signing.",
  },
  WALK_AWAY: {
    label: "WALK AWAY",
    color: "var(--color-risk-deal-breaker)",
    body: "Deal-breakers present. Do not sign as-is.",
  },
};

export function RiskScore({
  score,
  recommendation,
}: {
  score: number;
  recommendation: Recommendation;
}) {
  const [display, setDisplay] = useState(0);
  const meta = REC_META[recommendation];

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
        OVERALL RISK SCORE
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
