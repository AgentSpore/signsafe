"use client";

import Link from "next/link";
import { useState } from "react";
import type { AnalysisData } from "@/lib/api";
import { ClauseCard } from "./clause-card";
import { RiskScore } from "./risk-score";
import { ShareButton } from "./share-button";
import { NegotiationPanel } from "./negotiation-panel";
import { ExportButton } from "./export-button";
import { PDFPreview } from "./pdf-preview";
import { TranslatedSource } from "./translated-source";
import { LocaleSwitcher } from "./locale-switcher";
import { useLocale } from "./locale-provider";
import { SiteFooter } from "./site-footer";
import { translateAnalysis } from "@/lib/translate";
import { useEffect, useState as useStateInner } from "react";

export function AnalysisView({
  data,
  readOnly = false,
  pdfBytes = null,
}: {
  data: AnalysisData;
  readOnly?: boolean;
  pdfBytes?: ArrayBuffer | null;
}) {
  const [jumpPage, setJumpPage] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { locale, t } = useLocale();
  const [displayData, setDisplayData] = useStateInner<AnalysisData>(data);
  const [translating, setTranslating] = useStateInner(false);

  useEffect(() => {
    if (locale === "en") {
      setDisplayData(data);
      return;
    }
    setTranslating(true);
    translateAnalysis(data as AnalysisData & { id?: string }, locale)
      .then((translated) => {
        setDisplayData(translated);
      })
      .catch((err) => {
        console.error("Translation failed, falling back to EN", err);
        setDisplayData(data);
      })
      .finally(() => setTranslating(false));
  }, [locale, data]);

  const forceRetranslate = async () => {
    if (locale === "en") return;
    setTranslating(true);
    try {
      // Clear cached translation for this doc
      const docId = (data as { id?: string }).id;
      if (docId && typeof window !== "undefined") {
        Object.keys(localStorage)
          .filter((k) => k.startsWith(`signsafe:doc:${docId}:`) && k !== `signsafe:doc:${docId}`)
          .forEach((k) => localStorage.removeItem(k));
      }
      const fresh = await (await import("@/lib/translate")).translateAnalysis(
        data as AnalysisData & { id?: string },
        locale,
      );
      setDisplayData(fresh);
    } catch (e) {
      console.error("Force retranslate failed", e);
    } finally {
      setTranslating(false);
    }
  };

  const sorted = displayData.risk_clauses.slice().sort((a, b) => b.severity - a.severity);

  return (
    <main className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-ink-primary)]">
      <div className="fixed inset-0 grid-lines pointer-events-none opacity-40" />

      <header className="relative border-b border-[var(--color-divider)]">
        <div className="max-w-[1600px] mx-auto px-8 py-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 border-2 border-[var(--color-ink-primary)] flex items-center justify-center font-mono text-xs font-bold">
              §
            </div>
            <span className="font-mono text-sm tracking-widest uppercase">SignSafe</span>
          </Link>
          <div className="flex items-center gap-6 font-mono text-[10px] tracking-widest uppercase text-[var(--color-ink-tertiary)]">
            {readOnly && <span className="text-[var(--color-accent-electric)]">SHARED · READ-ONLY</span>}
            {!readOnly && <Link href="/history" className="hover:text-[var(--color-ink-primary)]">HISTORY</Link>}
          </div>
        </div>
      </header>

      <div className="relative max-w-[1600px] mx-auto px-8 py-12">
        {pdfBytes && (
          <div className="mb-6 flex justify-end">
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="font-mono text-[10px] tracking-widest uppercase border border-[var(--color-divider)] px-4 py-2 hover:bg-[var(--color-bg-surface)]"
            >
              {showPreview ? "✕ HIDE PREVIEW" : "⧉ SHOW PDF PREVIEW"}
            </button>
          </div>
        )}
        {showPreview && pdfBytes && (
          <div className="mb-6">
            <PDFPreview pdfBytes={pdfBytes} targetPage={jumpPage} />
          </div>
        )}
        {locale !== "en" && displayData.extracted_pages && displayData.extracted_pages.length > 0 && (
          <TranslatedSource pages={displayData.extracted_pages} />
        )}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
          <section className="lg:col-span-6 space-y-6">
            <div className="border border-[var(--color-divider)] bg-[var(--color-bg-surface)] p-8">
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-2">
                UNDER REVIEW
              </div>
              <h1 className="font-display text-4xl md:text-5xl leading-tight break-words">
                {displayData.filename}
              </h1>
              <div className="mt-4 font-mono text-[10px] tracking-widest uppercase text-[var(--color-ink-secondary)]">
                {data.num_pages} PAGES · {displayData.risk_clauses.length} CLAUSES FLAGGED
                {data.industry && ` · ${data.industry.toUpperCase()}`}
                {data.used_ocr && " · OCR"}
              </div>
            </div>

            {displayData.summary && (
              <div className="border border-[var(--color-divider)] bg-[var(--color-bg-surface)] p-8">
                <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-3">
                  ─── {t("analysis.summary")} ───
                  {translating && <span className="ml-2 text-[var(--color-accent-electric)]">· TRANSLATING...</span>}
                </div>
                <p className="font-body text-lg leading-relaxed whitespace-pre-wrap text-[var(--color-ink-primary)]">
                  {displayData.summary}
                </p>
              </div>
            )}

            {displayData.top_3_concerns.length > 0 && (
              <div className="border border-[var(--color-divider)] bg-[var(--color-bg-surface)] p-8">
                <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-3">
                  ─── {t("analysis.top3")} ───
                </div>
                <ol className="space-y-3 font-body">
                  {displayData.top_3_concerns.map((concern, i) => (
                    <li key={i} className="flex gap-4">
                      <span className="font-display text-3xl text-[var(--color-accent-electric)] leading-none">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-[var(--color-ink-primary)] pt-1">{concern}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="border border-[var(--color-divider)] bg-[var(--color-bg-surface)] p-8">
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-3">
                ─── {t("analysis.flagged")} · {sorted.length} ───
              </div>
              <div className="space-y-4">
                {sorted.length === 0 && (
                  <p className="font-body text-[var(--color-ink-secondary)]">
                    No predatory clauses detected.
                  </p>
                )}
                {sorted.map((c, i) => (
                  <ClauseCard
                    key={i}
                    clause={c}
                    index={i}
                    onJumpToPage={
                      pdfBytes
                        ? (page) => {
                            setShowPreview(true);
                            setJumpPage(page);
                            // force re-trigger
                            setTimeout(() => setJumpPage(null), 200);
                            setTimeout(() => setJumpPage(page), 220);
                          }
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>
          </section>

          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-8 space-y-6">
              <div className="flex justify-end gap-2 items-center">
                {locale !== "en" && (
                  <button
                    type="button"
                    onClick={forceRetranslate}
                    disabled={translating}
                    title="Force re-translate (clears cache)"
                    className="font-mono text-[10px] tracking-widest uppercase text-[var(--color-ink-tertiary)] hover:text-[var(--color-accent-signal)] border border-[var(--color-divider)] px-3 py-1.5 disabled:opacity-50"
                  >
                    {translating ? "..." : "⟳ RETRY"}
                  </button>
                )}
                <LocaleSwitcher />
              </div>
              <RiskScore score={displayData.overall_risk_score} recommendation={displayData.recommendation} />

              <div className="border border-[var(--color-divider)] bg-[var(--color-bg-surface)] p-6">
                <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-3">
                  CLAUSE BREAKDOWN
                </div>
                {[5, 4, 3, 2, 1].map((lvl) => {
                  const count = displayData.risk_clauses.filter((c) => c.severity === lvl).length;
                  const labels: Record<number, string> = {
                    5: "DEAL-BREAKER", 4: "CRITICAL", 3: "WARNING", 2: "CAUTION", 1: "INFO",
                  };
                  const colors: Record<number, string> = {
                    5: "var(--color-risk-deal-breaker)",
                    4: "var(--color-risk-critical)",
                    3: "var(--color-risk-warning)",
                    2: "var(--color-risk-caution)",
                    1: "var(--color-ink-tertiary)",
                  };
                  return (
                    <div
                      key={lvl}
                      className="flex items-center justify-between py-2 border-b border-[var(--color-divider)] last:border-0"
                    >
                      <div className="font-mono text-xs tracking-widest" style={{ color: colors[lvl] }}>
                        {labels[lvl]}
                      </div>
                      <div className="font-display text-2xl" style={{ color: colors[lvl] }}>{count}</div>
                    </div>
                  );
                })}
              </div>

              {!readOnly && <NegotiationPanel clauses={displayData.risk_clauses} />}
              <ExportButton data={displayData} />
              {!readOnly && <ShareButton data={data} />}

              <Link
                href="/"
                className="block text-center border border-[var(--color-divider)] px-6 py-4 font-mono text-xs tracking-widest uppercase text-[var(--color-ink-secondary)] hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-ink-primary)] transition"
              >
                ← ANALYZE ANOTHER LEASE
              </Link>
            </div>
          </aside>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
