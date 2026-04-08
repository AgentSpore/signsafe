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

const SEVERITY_COLOR: Record<number, [number, number, number]> = {
  1: [107, 103, 96],
  2: [255, 209, 102],
  3: [255, 138, 61],
  4: [255, 61, 90],
  5: [255, 0, 60],
};

const REC_COLOR: Record<string, [number, number, number]> = {
  SAFE_TO_SIGN: [212, 255, 79],
  NEGOTIATE_FIRST: [255, 138, 61],
  WALK_AWAY: [255, 0, 60],
};

export function exportAnalysisToPDF(data: AnalysisData): void {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > H - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Header mark
  doc.setDrawColor(20, 20, 28);
  doc.setLineWidth(1.2);
  doc.rect(margin, y, 18, 18);
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.text("§", margin + 5, y + 13);
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("SIGNSAFE · LEASE FORENSICS REPORT", margin + 28, y + 12);
  doc.text(new Date().toLocaleString(), W - margin, y + 12, { align: "right" });
  y += 40;

  // Title
  doc.setFont("times", "normal");
  doc.setFontSize(28);
  doc.setTextColor(20, 20, 28);
  const titleLines = doc.splitTextToSize(data.filename, W - margin * 2);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 32;

  // Meta line
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  const meta = [
    `${data.num_pages} PAGES`,
    `${data.risk_clauses.length} CLAUSES FLAGGED`,
    data.industry ? `INDUSTRY: ${data.industry.toUpperCase()}` : null,
    data.used_ocr ? "OCR USED" : null,
  ]
    .filter(Boolean)
    .join("  ·  ");
  doc.text(meta, margin, y);
  y += 20;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, W - margin, y);
  y += 28;

  // Risk score block
  const recColor = REC_COLOR[data.recommendation] || [80, 80, 80];
  doc.setFillColor(recColor[0], recColor[1], recColor[2]);
  doc.rect(margin, y, 6, 72, "F");

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("OVERALL RISK SCORE", margin + 16, y + 12);

  doc.setFont("times", "normal");
  doc.setFontSize(64);
  doc.setTextColor(recColor[0], recColor[1], recColor[2]);
  doc.text(String(data.overall_risk_score), margin + 16, y + 62);

  doc.setFont("courier", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text("/100", margin + 120, y + 62);

  doc.setFont("courier", "bold");
  doc.setFontSize(11);
  doc.setTextColor(recColor[0], recColor[1], recColor[2]);
  doc.text(`→ ${data.recommendation.replace(/_/g, " ")}`, margin + 180, y + 40);
  y += 96;

  // Summary
  if (data.summary) {
    ensureSpace(40);
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("─── EXECUTIVE SUMMARY ───", margin, y);
    y += 14;

    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 28);
    const summaryLines = doc.splitTextToSize(data.summary, W - margin * 2);
    for (const line of summaryLines) {
      ensureSpace(16);
      doc.text(line, margin, y);
      y += 14;
    }
    y += 12;
  }

  // Top concerns
  if (data.top_3_concerns.length > 0) {
    ensureSpace(40);
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("─── TOP 3 CONCERNS ───", margin, y);
    y += 18;

    data.top_3_concerns.forEach((concern, i) => {
      const lines = doc.splitTextToSize(concern, W - margin * 2 - 40);
      ensureSpace(lines.length * 14 + 12);
      doc.setFont("times", "normal");
      doc.setFontSize(20);
      doc.setTextColor(124, 92, 255);
      doc.text(String(i + 1).padStart(2, "0"), margin, y + 4);

      doc.setFont("times", "normal");
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 28);
      doc.text(lines, margin + 32, y);
      y += lines.length * 14 + 8;
    });
    y += 8;
  }

  // Clauses
  ensureSpace(40);
  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`─── FLAGGED CLAUSES · ${data.risk_clauses.length} ───`, margin, y);
  y += 22;

  const sortedClauses = data.risk_clauses.slice().sort((a, b) => b.severity - a.severity);

  for (let i = 0; i < sortedClauses.length; i++) {
    const c = sortedClauses[i];
    const color = SEVERITY_COLOR[c.severity] || [80, 80, 80];
    const label = SEVERITY_LABEL[c.severity] || "INFO";

    ensureSpace(80);

    // Severity bar
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(margin, y, 4, 60, "F");

    // Clause type + title
    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `CLAUSE_${String(i + 1).padStart(2, "0")} / ${c.clause_type.toUpperCase()}  ·  PAGE ${c.page_number}`,
      margin + 14,
      y + 9,
    );

    doc.setFont("times", "normal");
    doc.setFontSize(15);
    doc.setTextColor(20, 20, 28);
    const titleLines = doc.splitTextToSize(c.title, W - margin * 2 - 14);
    doc.text(titleLines, margin + 14, y + 24);
    y += 24 + titleLines.length * 16 + 4;

    // Severity label
    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(label, margin + 14, y);
    y += 14;

    // Original quote
    doc.setFont("times", "italic");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const quote = `"${c.original_text.slice(0, 400)}${c.original_text.length > 400 ? "…" : ""}"`;
    const quoteLines = doc.splitTextToSize(quote, W - margin * 2 - 28);
    for (const line of quoteLines) {
      ensureSpace(14);
      doc.text(line, margin + 18, y);
      y += 12;
    }
    y += 6;

    // Plain english
    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text("PLAIN ENGLISH", margin + 14, y);
    y += 10;
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    const peLines = doc.splitTextToSize(c.plain_english, W - margin * 2 - 14);
    for (const line of peLines) {
      ensureSpace(14);
      doc.text(line, margin + 14, y);
      y += 12;
    }
    y += 6;

    // Why risky
    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text("WHY IT'S RISKY", margin + 14, y);
    y += 10;
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    const wrLines = doc.splitTextToSize(c.why_risky, W - margin * 2 - 14);
    for (const line of wrLines) {
      ensureSpace(14);
      doc.text(line, margin + 14, y);
      y += 12;
    }
    y += 6;

    // Counter
    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    doc.setTextColor(30, 150, 80);
    doc.text("COUNTER LANGUAGE", margin + 14, y);
    y += 10;
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 28);
    const ncLines = doc.splitTextToSize(c.negotiation_counter, W - margin * 2 - 14);
    for (const line of ncLines) {
      ensureSpace(14);
      doc.text(line, margin + 14, y);
      y += 12;
    }
    y += 18;

    // Divider
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, W - margin, y);
    y += 16;
  }

  // Footer on every page
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      "SIGNSAFE · EDUCATIONAL TOOL · NOT LEGAL ADVICE · CONSULT A LICENSED ATTORNEY",
      margin,
      H - 24,
    );
    doc.text(`${p} / ${total}`, W - margin, H - 24, { align: "right" });
  }

  const safeName = data.filename.replace(/\.pdf$/i, "").replace(/[^a-z0-9]+/gi, "-");
  doc.save(`signsafe-report-${safeName}.pdf`);
}
