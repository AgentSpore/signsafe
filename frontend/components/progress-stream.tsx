"use client";

import type { StreamEvent } from "@/lib/api";

export function ProgressStream({ event }: { event: StreamEvent | null }) {
  const pct = event?.progress ?? 0;
  return (
    <div className="border border-[var(--color-divider)] bg-[var(--color-bg-surface)] p-8">
      <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-3">
        STAGE · {(event?.stage ?? "waiting").toUpperCase()}
      </div>
      <div className="font-display text-3xl mb-6 leading-tight">
        {event?.message ?? "Preparing forensics..."}
      </div>
      <div className="h-[3px] bg-[var(--color-bg-elevated)] mb-2 overflow-hidden">
        <div
          className="h-full bg-[var(--color-accent-signal)] transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="font-mono text-[10px] text-[var(--color-ink-tertiary)]">
        {pct.toString().padStart(3, "0")} / 100
      </div>
    </div>
  );
}
