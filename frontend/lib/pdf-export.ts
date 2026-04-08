"use client";

import jsPDF from "jspdf";
import type { AnalysisData } from "./api";

const SEVERITY_LABEL: Record<number, string> = {
  1: "INFO",
  2: "CAUTION",
  3: "WARNING",
  4: "CRITICAL",
  5: "DEAL-BREAKER",
};

const SEVERITY_COLOR: Record<number, string> = {
  1: "#6b6760",
  2: "#FFD166",
  3: "#FF8A3D",
  4: "#FF3D5A",
  5: "#FF003C",
};

const REC_COLOR: Record<string, string> = {
  SAFE_TO_SIGN: "#2D9D5A",
  NEGOTIATE_FIRST: "#E07A1A",
  WALK_AWAY: "#C8102E",
};

function buildReportHTML(data: AnalysisData): string {
  const sortedClauses = data.risk_clauses.slice().sort((a, b) => b.severity - a.severity);
  const recColor = REC_COLOR[data.recommendation] || "#333";
  const meta = [
    `${data.num_pages} PAGES`,
    `${data.risk_clauses.length} CLAUSES FLAGGED`,
    data.industry ? `INDUSTRY: ${data.industry.toUpperCase()}` : null,
    data.used_ocr ? "OCR USED" : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  const escape = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const fontStack =
    "'Inter', 'Helvetica Neue', 'Arial', 'Noto Sans', 'Noto Sans CJK SC', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  const serifStack =
    "'Georgia', 'Times New Roman', 'Noto Serif', 'Noto Serif CJK SC', serif";

  const clausesHTML = sortedClauses
    .map(
      (c, i) => `
    <div class="clause" style="page-break-inside: avoid;">
      <div class="clause-header">
        <div class="clause-bar" style="background:${SEVERITY_COLOR[c.severity]}"></div>
        <div class="clause-meta">
          <div class="mono small muted">CLAUSE_${String(i + 1).padStart(2, "0")} / ${escape(c.clause_type.toUpperCase())} · PAGE ${c.page_number}</div>
          <h3 class="clause-title">${escape(c.title)}</h3>
          <div class="severity-label" style="color:${SEVERITY_COLOR[c.severity]}">${SEVERITY_LABEL[c.severity]}</div>
        </div>
      </div>
      <blockquote class="quote">"${escape(c.original_text)}"</blockquote>
      <div class="section">
        <div class="section-label">PLAIN ENGLISH</div>
        <div class="section-body">${escape(c.plain_english)}</div>
      </div>
      <div class="section">
        <div class="section-label">WHY IT'S RISKY</div>
        <div class="section-body">${escape(c.why_risky)}</div>
      </div>
      <div class="section counter">
        <div class="section-label" style="color:#2D9D5A">COUNTER LANGUAGE</div>
        <div class="section-body">${escape(c.negotiation_counter)}</div>
      </div>
      ${c.benchmark ? `<div class="benchmark mono small muted">BENCHMARK · ${escape(c.benchmark)}</div>` : ""}
    </div>
  `,
    )
    .join("");

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
        #pdf-report .mono { font-family: 'JetBrains Mono', 'Courier New', monospace; letter-spacing: 0.05em; }
        #pdf-report .small { font-size: 9px; }
        #pdf-report .muted { color: #888; }
        #pdf-report .header {
          display: flex;
          align-items: center;
          gap: 12px;
          font-family: 'JetBrains Mono', monospace;
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
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          color: #888;
          letter-spacing: 0.1em;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid #eee;
        }
        #pdf-report .verdict {
          display: flex;
          align-items: stretch;
          gap: 16px;
          padding: 16px;
          background: #fafafa;
          margin-bottom: 24px;
          border-left: 6px solid ${recColor};
        }
        #pdf-report .verdict-score-block { flex: 1; }
        #pdf-report .verdict-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          color: #888;
          letter-spacing: 0.15em;
          margin-bottom: 4px;
        }
        #pdf-report .verdict-score {
          font-family: ${serifStack};
          font-size: 56px;
          line-height: 1;
          color: ${recColor};
          font-weight: 400;
        }
        #pdf-report .verdict-rec {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 600;
          color: ${recColor};
          letter-spacing: 0.1em;
          margin-top: 8px;
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
          font-family: 'JetBrains Mono', monospace;
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
          font-family: 'JetBrains Mono', monospace;
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
          font-family: 'JetBrains Mono', monospace;
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
        <div>SIGNSAFE · LEASE FORENSICS REPORT</div>
        <div class="header-spacer"></div>
        <div>${new Date().toLocaleString()}</div>
      </div>

      <h1 class="title">${escape(data.filename)}</h1>
      <div class="meta-line">${escape(meta)}</div>

      <div class="verdict">
        <div class="verdict-score-block">
          <div class="verdict-label">OVERALL RISK SCORE</div>
          <div class="verdict-score">${data.overall_risk_score}<span style="font-family:monospace;font-size:14px;color:#999;"> / 100</span></div>
          <div class="verdict-rec">→ ${data.recommendation.replace(/_/g, " ")}</div>
        </div>
      </div>

      ${
        data.summary
          ? `<div class="section-title">─── EXECUTIVE SUMMARY ───</div>
             <div class="summary">${escape(data.summary).replace(/\n/g, "<br>")}</div>`
          : ""
      }

      ${
        data.top_3_concerns.length > 0
          ? `<div class="section-title">─── TOP 3 CONCERNS ───</div>
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

      <div class="section-title">─── FLAGGED CLAUSES · ${data.risk_clauses.length} ───</div>
      ${clausesHTML}

      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #ccc;font-family:'JetBrains Mono',monospace;font-size:8px;color:#999;letter-spacing:0.1em;text-align:center;">
        SIGNSAFE · EDUCATIONAL TOOL · NOT LEGAL ADVICE · CONSULT A LICENSED ATTORNEY
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

    // Wait a tick for fonts/layout
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
