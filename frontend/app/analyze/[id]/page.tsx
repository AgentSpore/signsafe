"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AnalysisView } from "@/components/analysis-view";
import type { AnalysisData } from "@/lib/api";
import { loadAnalysis, loadPDFBytes } from "@/lib/storage";

export default function AnalyzePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<AnalysisData | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const loaded = loadAnalysis(id);
    if (loaded) {
      setData(loaded);
      setPdfBytes(loadPDFBytes(id));
    } else setMissing(true);
  }, [id]);

  if (missing) {
    return (
      <main className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-ink-primary)] flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)]">
            ERROR 404 / NOT IN LOCAL STORAGE
          </div>
          <h1 className="font-display text-5xl">Not found.</h1>
          <p className="font-body text-[var(--color-ink-secondary)]">
            This analysis is not stored in your browser. Results are saved locally only — if you cleared storage or opened another device, the data is gone.
          </p>
          <Link
            href="/"
            className="inline-block border border-[var(--color-divider)] px-6 py-3 font-mono text-xs tracking-widest uppercase hover:bg-[var(--color-bg-surface)]"
          >
            ← UPLOAD NEW LEASE
          </Link>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-ink-primary)] flex items-center justify-center">
        <div className="font-mono text-xs tracking-widest uppercase text-[var(--color-ink-tertiary)]">
          LOADING…
        </div>
      </main>
    );
  }

  return <AnalysisView data={data} pdfBytes={pdfBytes} />;
}
