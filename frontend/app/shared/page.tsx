"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnalysisView } from "@/components/analysis-view";
import type { AnalysisData } from "@/lib/api";
import { decodeShareFragment } from "@/lib/storage";

export default function SharedPage() {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#d=")) {
      setInvalid(true);
      return;
    }
    const fragment = hash.slice(3);
    const decoded = decodeShareFragment(fragment);
    if (decoded) setData(decoded);
    else setInvalid(true);
  }, []);

  if (invalid) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 text-[var(--color-ink-primary)]">
        <div className="max-w-md text-center space-y-4">
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)]">
            INVALID SHARE LINK
          </div>
          <h1 className="font-display text-5xl">Can&rsquo;t decode.</h1>
          <Link href="/" className="inline-block border border-[var(--color-divider)] px-6 py-3 font-mono text-xs tracking-widest uppercase hover:bg-[var(--color-bg-surface)]">
            ← HOME
          </Link>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center text-[var(--color-ink-primary)]">
        <div className="font-mono text-xs tracking-widest uppercase text-[var(--color-ink-tertiary)]">LOADING…</div>
      </main>
    );
  }

  return <AnalysisView data={data} readOnly />;
}
