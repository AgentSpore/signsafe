"use client";

import type { ExtractedPage } from "@/lib/api";

export function TranslatedSource({ pages }: { pages: ExtractedPage[] | undefined }) {
  if (!pages || pages.length === 0) return null;

  return (
    <div className="border border-[var(--color-divider)] bg-[var(--color-bg-surface)] p-6 mb-6">
      <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-4">
        ─── DOCUMENT TEXT (TRANSLATED) · {pages.length} PAGES ───
      </div>
      <div className="max-h-[60vh] overflow-y-auto space-y-6 bg-[var(--color-bg-base)] p-4">
        {pages.map((p) => (
          <div key={p.page_number} className="border-l-2 border-[var(--color-divider)] pl-4">
            <div className="font-mono text-[9px] tracking-widest uppercase text-[var(--color-ink-tertiary)] mb-2">
              PAGE {p.page_number}
            </div>
            <pre className="font-body text-sm text-[var(--color-ink-secondary)] leading-relaxed whitespace-pre-wrap break-words">
              {p.text}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
