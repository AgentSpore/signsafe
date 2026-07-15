"use client";

import Link from "next/link";
import { useState } from "react";
import { isAbstained, type AnalysisData, type RiskClause } from "@/lib/api";
import { ClauseCard } from "./clause-card";
import {
  OcrQualityBanner,
  RedactionPanel,
  ReliabilityBanner,
  SeverityPanel,
} from "./severity-panel";
import { ShareButton } from "./share-button";
import { NegotiationPanel } from "./negotiation-panel";
import { ExportButton } from "./export-button";
import { PDFPreview } from "./pdf-preview";
import { useLocale } from "./locale-provider";
import { SiteFooter } from "./site-footer";

/**
 * The result view is RU-only for the beta.
 *
 * It previously translated the analysis into the selected locale, which egressed
 * model-derived prose to Google Translate. The whole translate path — including our own
 * public /api/translate endpoint — has been removed (see
 * src/signsafe/services/outbound.py). The analysis is rendered exactly as the backend
 * returned it, so the only third party that ever sees anything derived from the document
 * is OpenRouter.
 */
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
  const { t } = useLocale();

  // Severity-desc, abstained clauses last: they carry no verdict, so they rank below an
  // INFO finding instead of jumping to the top via a null→0 coercion.
  const rank = (c: RiskClause) => (isAbstained(c) ? -1 : (c.severity as number));
  const sorted = data.risk_clauses.slice().sort((a, b) => rank(b) - rank(a));
  // Pre-signing checklist — tenant-profile clauses classified void / disputable, void first.
  const isTenantMode = data.industry === "residential_lease";
  const legalityRank: Record<string, number> = { void: 0, disputable: 1 };
  const checklist = data.risk_clauses
    .filter((c) => c.legality === "void" || c.legality === "disputable")
    .sort((a, b) => (legalityRank[a.legality!] ?? 9) - (legalityRank[b.legality!] ?? 9));

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
            {readOnly && <span className="text-[var(--color-accent-electric)]">{t("shared.readOnly")}</span>}
            {!readOnly && <Link href="/history" className="hover:text-[var(--color-ink-primary)]">{t("nav.history").toUpperCase()}</Link>}
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
              {showPreview ? t("analysis.hidePreview") : t("analysis.showPreview")}
            </button>
          </div>
        )}
        {showPreview && pdfBytes && (
          <div className="mb-6">
            <PDFPreview pdfBytes={pdfBytes} targetPage={jumpPage} />
          </div>
        )}
        {/* A "ТЕКСТ ДОКУМЕНТА (ПЕРЕВЕДЁН)" panel used to render here for non-RU locales.
            With result translation removed it could only ever show the untranslated
            source under a "переведён" heading, so it is gone with the rest of the path. */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
          <section className="lg:col-span-6 space-y-6">
            <div className="border border-[var(--color-divider)] bg-[var(--color-bg-surface)] p-8">
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-2">
                {t("analysis.underReview")} · {t("beta.badge")}
              </div>
              <h1 className="font-display text-3xl md:text-5xl leading-tight break-words">
                {data.filename}
              </h1>
              <div className="mt-4 font-mono text-[10px] tracking-widest uppercase text-[var(--color-ink-secondary)]">
                {data.num_pages} {t("analysis.pages")} · {data.risk_clauses.length}{" "}
                {t("analysis.clausesFlagged")}
                {data.industry && ` · ${t(`industry.${data.industry}`)}`}
                {data.used_ocr && ` · ${t("pdf.ocrUsed")}`}
              </div>
            </div>

            {/* Honesty layer: the reliability notice sits above the findings, not in the
                footer — it qualifies everything below it. */}
            <ReliabilityBanner />

            {data.ocr_quality_low && <OcrQualityBanner />}

            {data.summary && (
              <div className="border border-[var(--color-divider)] bg-[var(--color-bg-surface)] p-8">
                <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-3">
                  ─── {t("analysis.summary")} ───
                </div>
                <p className="font-body text-lg leading-relaxed whitespace-pre-wrap text-[var(--color-ink-primary)]">
                  {data.summary}
                </p>
              </div>
            )}

            {data.top_3_concerns.length > 0 && (
              <div className="border border-[var(--color-divider)] bg-[var(--color-bg-surface)] p-8">
                <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-3">
                  ─── {t("analysis.top3")} ───
                </div>
                <p className="sr-only">{/* locale-aware */}</p>
                <ol className="space-y-3 font-body">
                  {data.top_3_concerns.map((concern, i) => (
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

            {(isTenantMode || checklist.length > 0) && (
              <div className="border border-[var(--color-accent-signal)] bg-[var(--color-bg-surface)] p-8">
                {checklist.length > 0 && (
                  <>
                    <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-accent-signal)] mb-3">
                      ─── {t("checklist.title")} · {checklist.length} ───
                    </div>
                    <ul className="space-y-4 font-body">
                      {checklist.map((c, i) => (
                        <li key={i} className="flex gap-3">
                          <span aria-hidden className="pt-0.5">
                            {c.legality === "void" ? "🔴" : "🟠"}
                          </span>
                          <div>
                            <div className="text-[var(--color-ink-primary)] font-semibold">
                              {c.title}
                            </div>
                            {c.legality_gloss && (
                              <div className="text-sm text-[var(--color-ink-secondary)] leading-relaxed mt-0.5">
                                {c.legality_gloss}
                              </div>
                            )}
                            {c.norm_ref && (
                              <div className="font-mono text-[10px] text-[var(--color-ink-tertiary)] mt-1">
                                {c.norm_ref}
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <p
                  className={`font-mono text-[10px] tracking-wide uppercase text-[var(--color-ink-tertiary)] leading-relaxed ${
                    checklist.length > 0
                      ? "mt-6 pt-4 border-t border-[var(--color-divider)]"
                      : ""
                  }`}
                >
                  {t("checklist.disclaimer")}
                </p>
              </div>
            )}

            <div className="border border-[var(--color-divider)] bg-[var(--color-bg-surface)] p-8">
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-3">
                ─── {t("analysis.flagged")} · {sorted.length} ───
              </div>
              <div className="space-y-4">
                {sorted.length === 0 && (
                  <p className="font-body text-[var(--color-ink-secondary)]">
                    {t("analysis.noClauses")}
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
              {/* No locale switcher here: offering EN/DE/… would promise a translated
                  разбор we deliberately no longer produce. A plain note is the honest
                  version of the same information. */}
              <div className="border border-[var(--color-divider)] bg-[var(--color-bg-surface)] px-4 py-3">
                <p className="font-mono text-[10px] tracking-wider uppercase text-[var(--color-ink-tertiary)] leading-relaxed">
                  {t("analysis.ruOnly")}
                </p>
              </div>
              <SeverityPanel data={data} />
              <RedactionPanel categories={data.redacted_categories} />

              <div className="border border-[var(--color-divider)] bg-[var(--color-bg-surface)] p-6">
                <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-3">
                  {t("analysis.breakdown")}
                </div>
                {[5, 4, 3, 2, 1].map((lvl) => {
                  const count = data.risk_clauses.filter((c) => c.severity === lvl).length;
                  const labels: Record<number, string> = {
                    5: t("scale.dealBreaker"),
                    4: t("scale.critical"),
                    3: t("scale.warning"),
                    2: t("scale.caution"),
                    1: t("scale.info"),
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

              {!readOnly && <NegotiationPanel clauses={data.risk_clauses} isMedBill={data.industry === "medical_bill"} />}
              <ExportButton data={data} />
              {!readOnly && <ShareButton data={data} />}

              <Link
                href="/"
                className="block text-center border border-[var(--color-divider)] px-6 py-4 font-mono text-xs tracking-widest uppercase text-[var(--color-ink-secondary)] hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-ink-primary)] transition"
              >
                {t("analysis.another")}
              </Link>
            </div>
          </aside>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
