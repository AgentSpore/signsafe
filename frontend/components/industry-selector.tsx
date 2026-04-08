"use client";

import { INDUSTRIES, type Industry } from "@/lib/industry";
import { useLocale } from "./locale-provider";

export function IndustrySelector({
  value,
  onChange,
}: {
  value: Industry | null;
  onChange: (v: Industry) => void;
}) {
  const { t } = useLocale();
  return (
    <div className="space-y-3">
      <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)]">
        {t("industry.label")}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[var(--color-divider)]">
        {INDUSTRIES.map((ind) => {
          const active = value === ind.id;
          return (
            <button
              key={ind.id}
              type="button"
              onClick={() => onChange(ind.id)}
              className={`p-4 text-left transition-colors ${
                active
                  ? "bg-[var(--color-accent-signal)] text-[var(--color-bg-base)]"
                  : "bg-[var(--color-bg-surface)] text-[var(--color-ink-primary)] hover:bg-[var(--color-bg-elevated)]"
              }`}
            >
              <div className="font-mono text-[10px] tracking-widest uppercase font-semibold">
                {t(`industry.${ind.id}`)}
              </div>
              <div
                className={`font-body text-[10px] leading-tight mt-1 ${
                  active ? "text-[var(--color-bg-base)]" : "text-[var(--color-ink-tertiary)]"
                }`}
              >
                {t(`industry.${ind.id}.hint`)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
