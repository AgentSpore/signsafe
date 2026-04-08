"use client";

import { useState } from "react";
import type { AnalysisData } from "@/lib/api";
import { exportAnalysisToPDF } from "@/lib/pdf-export";

export function ExportButton({ data }: { data: AnalysisData }) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      exportAnalysisToPDF(data);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading}
      className="w-full bg-[var(--color-accent-electric)] text-[var(--color-ink-primary)] px-6 py-4 font-mono text-xs tracking-widest uppercase font-semibold hover:bg-[var(--color-ink-primary)] hover:text-[var(--color-bg-base)] transition-colors disabled:opacity-60"
    >
      {loading ? "GENERATING…" : "⬇ EXPORT PDF REPORT"}
    </button>
  );
}
