"use client";

import jsPDF from "jspdf";
import { UI_EN } from "./i18n";
import { deriveSeveritySummary, isAbstained, type AnalysisData, type RiskClause } from "./api";
import { isResidentialLease } from "./industry";

/**
 * The report is rendered by rasterizing a hidden DOM tree (html2canvas) and placing the
 * bitmap into jsPDF — jsPDF's own text layer is only used for the page numbers, which are
 * ASCII. That means Cyrillic renders through the *document's* fonts, not jsPDF's built-in
 * Helvetica (which has no Cyrillic glyphs and would produce tofu). The report therefore
 * pins "PT Sans" — vendored at public/fonts, declared @font-face in globals.css — and
 * exportAnalysisToPDF awaits document.fonts.ready before rasterizing so the glyphs are
 * actually available at draw time.
 */
const RU_FONT_STACK = "'PT Sans', 'Arial', sans-serif";

// The label strings live in the i18n dict (RU source). The export runs outside React, so
// it reads UI_EN directly rather than through the useLocale hook: the PDF is always the
// RU source text, never a runtime-translated locale.
const L = (key: string): string => UI_EN[key] ?? key;

const SEVERITY_LABEL: Record<number, string> = {
  1: L("pdf.severity.info"),
  2: L("pdf.severity.caution"),
  3: L("pdf.severity.warning"),
  4: L("pdf.severity.critical"),
  5: L("pdf.severity.dealBreaker"),
};

const SEVERITY_COLOR: Record<number, string> = {
  1: "#6b6760",
  2: "#FFD166",
  3: "#FF8A3D",
  4: "#FF3D5A",
  5: "#FF003C",
};

// Abstention has no risk colour by design — it is the absence of a verdict.
const ABSTAIN_COLOR = "#7C5CFF";

const LEGALITY_META: Record<string, { label: string; color: string }> = {
  void: { label: L("legality.void"), color: "#FF003C" },
  disputable: { label: L("legality.disputable"), color: "#FF8A3D" },
  ok: { label: L("legality.ok"), color: "#2D9D5A" },
};

function severityLabel(clause: RiskClause): string {
  return isAbstained(clause) ? L("pdf.severity.abstained") : SEVERITY_LABEL[clause.severity as number];
}

function severityColor(clause: RiskClause): string {
  return isAbstained(clause) ? ABSTAIN_COLOR : SEVERITY_COLOR[clause.severity as number];
}

function buildReportHTML(data: AnalysisData): string {
  const rank = (c: RiskClause) => (isAbstained(c) ? -1 : (c.severity as number));
  const sortedClauses = data.risk_clauses.slice().sort((a, b) => rank(b) - rank(a));
  const summary = data.severity_summary ?? deriveSeveritySummary(data.risk_clauses);
  const isTenant = isResidentialLease(data.industry ?? null);
  const meta = [
    `${data.num_pages} ${L("pdf.pages")}`,
    `${data.risk_clauses.length} ${L("pdf.clausesFlagged")}`,
    data.industry ? `${L("pdf.docType")}: ${L(`industry.${data.industry}`)}` : null,
    data.used_ocr ? L("pdf.ocrUsed") : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  const escape = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  // Both stacks resolve to PT Sans: it is the only vendored face with Cyrillic coverage,
  // and a Latin-only serif here would silently tofu the entire Russian report.
  const fontStack = RU_FONT_STACK;
  const serifStack = RU_FONT_STACK;

  const clausesHTML = sortedClauses
    .map((c, i) => {
      const color = severityColor(c);
      const legality = c.legality ? LEGALITY_META[c.legality] : null;
      return `
    <div class="clause" style="page-break-inside: avoid;">
      <div class="clause-header">
        <div class="clause-bar" style="background:${color}"></div>
        <div class="clause-meta">
          <div class="mono small muted">${L("pdf.clause")}_${String(i + 1).padStart(2, "0")} · ${L("pdf.page")} ${c.page_number}</div>
          <h3 class="clause-title">${escape(c.title)}</h3>
          <div class="severity-label" style="color:${color}">${severityLabel(c)}</div>
        </div>
      </div>
      ${
        legality
          ? `<div class="legality" style="border-color:${legality.color}">
               <div class="mono small" style="color:${legality.color};font-weight:600;">
                 ${L("pdf.legality")}: ${legality.label}${c.norm_ref ? ` · ${escape(c.norm_ref)}` : ""}
               </div>
               ${c.legality_gloss ? `<div class="section-body" style="margin-top:4px;">${escape(c.legality_gloss)}</div>` : ""}
             </div>`
          : ""
      }
      <blockquote class="quote">«${escape(c.original_text)}»</blockquote>
      <div class="section">
        <div class="section-label">${L("pdf.plainEnglish")}</div>
        <div class="section-body">${escape(c.plain_english)}</div>
      </div>
      <div class="section">
        <div class="section-label">${L("pdf.whyRisky")}</div>
        <div class="section-body">${escape(c.why_risky)}</div>
      </div>
      <div class="section counter">
        <div class="section-label" style="color:#2D9D5A">${L("pdf.counter")}</div>
        <div class="section-body">${escape(c.negotiation_counter)}</div>
      </div>
      ${c.benchmark ? `<div class="benchmark mono small muted">${L("pdf.benchmark")} · ${escape(c.benchmark)}</div>` : ""}
    </div>
  `;
    })
    .join("");

  // Pre-signing checklist — tenant profile only, void first (mirrors the on-screen view).
  const legalityRank: Record<string, number> = { void: 0, disputable: 1 };
  const checklist = data.risk_clauses
    .filter((c) => c.legality === "void" || c.legality === "disputable")
    .sort((a, b) => (legalityRank[a.legality!] ?? 9) - (legalityRank[b.legality!] ?? 9));

  const checklistHTML =
    isTenant && checklist.length > 0
      ? `<div class="section-title">─── ${L("checklist.title")} · ${checklist.length} ───</div>
         <div class="checklist">
           ${checklist
             .map(
               (c) => `
             <div class="checklist-item">
               <div class="checklist-title" style="color:${LEGALITY_META[c.legality!].color}">
                 ${LEGALITY_META[c.legality!].label} · ${escape(c.title)}
               </div>
               ${c.legality_gloss ? `<div class="section-body">${escape(c.legality_gloss)}</div>` : ""}
               ${c.norm_ref ? `<div class="mono small muted">${escape(c.norm_ref)}</div>` : ""}
             </div>`,
             )
             .join("")}
         </div>
         <div class="disclaimer">${L("checklist.disclaimer")}</div>`
      : "";

  const redactionHTML =
    data.redacted_categories && data.redacted_categories.length > 0
      ? `<div class="meta-line" style="border:0;padding:0;margin-bottom:16px;">
           ${L("pdf.redacted")}: ${escape(data.redacted_categories.join(" · "))}
         </div>`
      : "";

  return `
    <div id="pdf-report" style="
      width: 720px;
      padding: 48px;
      background: #ffffff;
      color: #14141C;
      font-family: ${fontStack};
      font-size: 12px;
      line-height: 1.5;
    ">
      <style>
        #pdf-report .mono { font-family: ${fontStack}; letter-spacing: 0.05em; }
        #pdf-report .small { font-size: 9px; }
        #pdf-report .muted { color: #888; }
        #pdf-report .header {
          display: flex;
          align-items: center;
          gap: 12px;
          font-family: ${fontStack};
          font-size: 9px;
          color: #888;
          letter-spacing: 0.15em;
          padding-bottom: 12px;
          border-bottom: 1px solid #ccc;
          margin-bottom: 24px;
        }
        #pdf-report .header-mark {
          width: 22px; height: 22px; border: 2px solid #14141C;
          display: flex; align-items: center; justify-content: center;
          font-family: ${serifStack}; font-size: 14px; font-weight: bold;
          color: #14141C;
        }
        #pdf-report .header-spacer { flex: 1; }
        #pdf-report h1.title {
          font-family: ${serifStack};
          font-size: 32px;
          font-weight: 400;
          margin: 0 0 8px;
          line-height: 1.1;
          word-break: break-word;
        }
        #pdf-report .meta-line {
          font-family: ${fontStack};
          font-size: 9px;
          color: #888;
          letter-spacing: 0.1em;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid #eee;
        }
        #pdf-report .reliability {
          border: 1px solid #7C5CFF;
          padding: 12px 16px;
          margin-bottom: 20px;
          font-family: ${fontStack};
          font-size: 10px;
          line-height: 1.5;
          color: #333;
        }
        #pdf-report .counts {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }
        #pdf-report .count-cell {
          flex: 1;
          padding: 12px;
          background: #fafafa;
          border-top: 3px solid #ccc;
        }
        #pdf-report .count-num {
          font-family: ${serifStack};
          font-size: 32px;
          line-height: 1;
          font-weight: 700;
        }
        #pdf-report .count-label {
          font-family: ${fontStack};
          font-size: 7px;
          letter-spacing: 0.1em;
          margin-top: 4px;
        }
        #pdf-report .legality {
          border-left: 3px solid #888;
          padding: 8px 12px;
          margin: 0 0 10px;
          background: #fafafa;
        }
        #pdf-report .checklist { margin-bottom: 16px; }
        #pdf-report .checklist-item {
          padding: 10px 0;
          border-bottom: 1px solid #eee;
          page-break-inside: avoid;
        }
        #pdf-report .checklist-title {
          font-family: ${fontStack};
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.08em;
          margin-bottom: 4px;
        }
        #pdf-report .disclaimer {
          font-family: ${fontStack};
          font-size: 9px;
          color: #666;
          line-height: 1.5;
          padding: 10px 12px;
          background: #fafafa;
          margin-bottom: 24px;
        }
        #pdf-report .summary {
          font-family: ${serifStack};
          font-size: 12px;
          line-height: 1.6;
          margin-bottom: 24px;
          padding: 16px;
          background: #fafafa;
        }
        #pdf-report .section-title {
          font-family: ${fontStack};
          font-size: 9px;
          color: #888;
          letter-spacing: 0.15em;
          margin: 24px 0 8px;
        }
        #pdf-report .concerns { margin-bottom: 24px; }
        #pdf-report .concern {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
          page-break-inside: avoid;
        }
        #pdf-report .concern-num {
          font-family: ${serifStack};
          font-size: 24px;
          color: #7C5CFF;
          line-height: 1;
          min-width: 32px;
        }
        #pdf-report .concern-text {
          font-family: ${serifStack};
          font-size: 12px;
          padding-top: 4px;
          line-height: 1.5;
        }
        #pdf-report .clause {
          border: 1px solid #e0e0e0;
          padding: 16px;
          margin-bottom: 16px;
          background: #fff;
        }
        #pdf-report .clause-header {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }
        #pdf-report .clause-bar { width: 4px; flex-shrink: 0; }
        #pdf-report .clause-meta { flex: 1; }
        #pdf-report .clause-title {
          font-family: ${serifStack};
          font-size: 16px;
          font-weight: 400;
          margin: 4px 0;
          line-height: 1.2;
        }
        #pdf-report .severity-label {
          font-family: ${fontStack};
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.15em;
          margin-top: 4px;
        }
        #pdf-report blockquote.quote {
          border-left: 2px solid #888;
          padding: 4px 12px;
          margin: 8px 0 12px;
          font-family: ${serifStack};
          font-style: italic;
          font-size: 11px;
          color: #555;
          line-height: 1.5;
        }
        #pdf-report .section { margin-bottom: 10px; }
        #pdf-report .section-label {
          font-family: ${fontStack};
          font-size: 8px;
          color: #888;
          letter-spacing: 0.15em;
          margin-bottom: 4px;
        }
        #pdf-report .section-body {
          font-family: ${serifStack};
          font-size: 11px;
          line-height: 1.5;
          color: #14141C;
        }
        #pdf-report .counter .section-body { color: #1A6334; }
        #pdf-report .benchmark { margin-top: 6px; }
      </style>

      <div class="header">
        <div class="header-mark">§</div>
        <div>${L("pdf.reportTitle")}</div>
        <div class="header-spacer"></div>
        <div>${new Date().toLocaleString("ru-RU")}</div>
      </div>

      <h1 class="title">${escape(data.filename)}</h1>
      <div class="meta-line">${escape(meta)}</div>

      ${redactionHTML}

      <div class="reliability">${L("reliability.body")}</div>

      <div class="counts">
        <div class="count-cell" style="border-top-color:${SEVERITY_COLOR[4]}">
          <div class="count-num" style="color:${SEVERITY_COLOR[4]}">${summary.critical}</div>
          <div class="count-label" style="color:${SEVERITY_COLOR[4]}">${L("summary.critical")}</div>
        </div>
        <div class="count-cell" style="border-top-color:${SEVERITY_COLOR[3]}">
          <div class="count-num" style="color:${SEVERITY_COLOR[3]}">${summary.disputable}</div>
          <div class="count-label" style="color:${SEVERITY_COLOR[3]}">${L("summary.disputable")}</div>
        </div>
        <div class="count-cell" style="border-top-color:${SEVERITY_COLOR[1]}">
          <div class="count-num" style="color:${SEVERITY_COLOR[1]}">${summary.info}</div>
          <div class="count-label" style="color:${SEVERITY_COLOR[1]}">${L("summary.info")}</div>
        </div>
        <div class="count-cell" style="border-top-color:${ABSTAIN_COLOR}">
          <div class="count-num" style="color:${ABSTAIN_COLOR}">${summary.abstained}</div>
          <div class="count-label" style="color:${ABSTAIN_COLOR}">${L("summary.abstained")}</div>
        </div>
      </div>

      ${
        data.summary
          ? `<div class="section-title">─── ${L("pdf.summary")} ───</div>
             <div class="summary">${escape(data.summary).replace(/\n/g, "<br>")}</div>`
          : ""
      }

      ${
        data.top_3_concerns.length > 0
          ? `<div class="section-title">─── ${L("pdf.top3")} ───</div>
             <div class="concerns">
               ${data.top_3_concerns
                 .map(
                   (c, i) => `
                 <div class="concern">
                   <div class="concern-num">${String(i + 1).padStart(2, "0")}</div>
                   <div class="concern-text">${escape(c)}</div>
                 </div>`,
                 )
                 .join("")}
             </div>`
          : ""
      }

      ${checklistHTML}

      <div class="section-title">─── ${L("pdf.flagged")} · ${data.risk_clauses.length} ───</div>
      ${clausesHTML}

      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #ccc;font-family:${fontStack};font-size:8px;color:#999;letter-spacing:0.1em;text-align:center;">
        ${L("pdf.footer")}
      </div>
    </div>
  `;
}

export async function exportAnalysisToPDF(data: AnalysisData): Promise<void> {
  // Mount hidden DOM tree for rendering
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-9999px";
  wrapper.style.top = "0";
  wrapper.innerHTML = buildReportHTML(data);
  document.body.appendChild(wrapper);

  try {
    const html2canvasMod = await import("html2canvas-pro");
    const html2canvas = html2canvasMod.default;

    const reportEl = wrapper.querySelector<HTMLDivElement>("#pdf-report");
    if (!reportEl) throw new Error("Report element missing");

    // PT Sans must be resolved before html2canvas rasterizes: it snapshots whatever the
    // layout resolves to at draw time, so exporting during `font-display: swap` fallback
    // bakes the fallback face (or tofu) into the PDF permanently.
    if (document.fonts) {
      try {
        await document.fonts.load("400 12px 'PT Sans'");
        await document.fonts.load("700 12px 'PT Sans'");
        await document.fonts.ready;
      } catch {
        // Font loading is best-effort — a failure here degrades glyphs, not the export.
      }
    }
    // Wait a tick for layout to settle
    await new Promise((r) => setTimeout(r, 100));

    const canvas = await html2canvas(reportEl, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });

    // Build multi-page PDF (Letter size)
    const pdf = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 24;
    const contentW = pageW - margin * 2;
    const ratio = contentW / canvas.width;
    const imgH = canvas.height * ratio;

    if (imgH <= pageH - margin * 2) {
      // Single page
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      pdf.addImage(dataUrl, "JPEG", margin, margin, contentW, imgH);
    } else {
      // Multi-page slicing
      const pageContentH = pageH - margin * 2;
      const sliceHeightPx = pageContentH / ratio;
      const totalSlices = Math.ceil(canvas.height / sliceHeightPx);

      for (let i = 0; i < totalSlices; i++) {
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        const sliceTop = i * sliceHeightPx;
        const sliceHeight = Math.min(sliceHeightPx, canvas.height - sliceTop);
        sliceCanvas.height = sliceHeight;
        const ctx = sliceCanvas.getContext("2d");
        if (!ctx) continue;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(
          canvas,
          0,
          sliceTop,
          canvas.width,
          sliceHeight,
          0,
          0,
          canvas.width,
          sliceHeight,
        );
        const dataUrl = sliceCanvas.toDataURL("image/jpeg", 0.92);
        if (i > 0) pdf.addPage();
        pdf.addImage(dataUrl, "JPEG", margin, margin, contentW, sliceHeight * ratio);
      }
    }

    // Footer with pagination
    const total = pdf.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      pdf.setPage(p);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(150);
      pdf.text(`${p} / ${total}`, pageW - margin, pageH - 8, { align: "right" });
    }

    const safeName = data.filename.replace(/\.pdf$/i, "").replace(/[^a-z0-9]+/gi, "-");
    pdf.save(`signsafe-report-${safeName}.pdf`);
  } finally {
    document.body.removeChild(wrapper);
  }
}
