"use client";

import type { BlockedResult } from "@/lib/api";
import { useLocale } from "./locale-provider";

/**
 * A typed refusal from the backend, rendered as a clean RU screen.
 *
 * These are the two cases where the pipeline deliberately declines rather than inventing
 * an answer: the upload is not a contract, or it names a deprecated US-law preset that
 * must never be silently re-read under РФ law. Neither is an error — so neither gets the
 * red error treatment.
 */
export function BlockedScreen({
  result,
  onReset,
}: {
  result: BlockedResult;
  onReset: () => void;
}) {
  const { t } = useLocale();
  const notContract = result.status === "not_contract";

  const title = notContract ? t("blocked.notContract.title") : t("blocked.unsupported.title");
  const body = notContract ? t("blocked.notContract.body") : t("blocked.unsupported.body");

  return (
    <div className="border border-[var(--color-accent-electric)] bg-[var(--color-bg-surface)] p-8 md:p-10">
      <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-accent-electric)] mb-3">
        {notContract ? "01 / —" : "02 / —"}
      </div>

      <h2 className="font-display text-3xl md:text-4xl leading-tight mb-4">{title}</h2>

      <p className="font-body text-base text-[var(--color-ink-secondary)] leading-relaxed max-w-2xl mb-6">
        {body}
      </p>

      {/* The backend's own copy — shown when it says something more specific than our
          generic screen (it localizes its refusals itself). */}
      {result.message && result.message !== body && (
        <p className="font-body text-sm text-[var(--color-ink-tertiary)] leading-relaxed max-w-2xl mb-6 border-l-2 border-[var(--color-divider)] pl-4">
          {result.message}
        </p>
      )}

      <button
        type="button"
        onClick={onReset}
        className="font-mono text-xs tracking-widest uppercase border border-[var(--color-divider)] px-6 py-4 text-[var(--color-ink-secondary)] hover:bg-[var(--color-bg-base)] hover:text-[var(--color-ink-primary)] transition"
      >
        {t("blocked.back")}
      </button>
    </div>
  );
}
