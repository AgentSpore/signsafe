"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteAnalysis, clearAllHistory, loadHistory, type HistoryEntry } from "@/lib/storage";
import { SyncPanel } from "@/components/sync-panel";
import { SiteFooter } from "@/components/site-footer";

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  const refresh = () => setEntries(loadHistory());

  useEffect(() => {
    refresh();
  }, []);

  function handleDelete(id: string) {
    deleteAnalysis(id);
    setEntries(loadHistory());
  }

  function handleClear() {
    if (confirm("Delete all analyses from your browser?")) {
      clearAllHistory();
      setEntries([]);
    }
  }

  const recColors: Record<string, string> = {
    SAFE_TO_SIGN: "var(--color-accent-signal)",
    NEGOTIATE_FIRST: "var(--color-risk-warning)",
    WALK_AWAY: "var(--color-risk-deal-breaker)",
  };

  return (
    <main className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-ink-primary)]">
      <div className="fixed inset-0 grid-lines pointer-events-none opacity-40" />

      <header className="relative border-b border-[var(--color-divider)]">
        <div className="max-w-[1400px] mx-auto px-8 py-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 border-2 border-[var(--color-ink-primary)] flex items-center justify-center font-mono text-xs font-bold">§</div>
            <span className="font-mono text-sm tracking-widest uppercase">SignSafe</span>
          </Link>
          <Link href="/" className="font-mono text-[10px] tracking-widest uppercase text-[var(--color-ink-tertiary)] hover:text-[var(--color-ink-primary)]">
            ← NEW ANALYSIS
          </Link>
        </div>
      </header>

      <div className="relative max-w-[1400px] mx-auto px-8 py-16">
        <div className="mb-10 max-w-lg">
          <SyncPanel onSynced={refresh} />
        </div>
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-4">
          § LOCAL HISTORY
        </div>
        <div className="flex items-end justify-between mb-12">
          <h1 className="font-display text-6xl md:text-7xl">Your archive.</h1>
          {entries.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="font-mono text-[10px] tracking-widest uppercase text-[var(--color-risk-critical)] border border-[var(--color-risk-critical)] px-4 py-2 hover:bg-[var(--color-risk-critical)] hover:text-[var(--color-bg-base)] transition"
            >
              CLEAR ALL
            </button>
          )}
        </div>

        {entries.length === 0 && (
          <div className="border border-dashed border-[var(--color-divider)] p-16 text-center">
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-4">
              EMPTY
            </div>
            <p className="font-body text-[var(--color-ink-secondary)] mb-6">
              No analyses yet. Upload a lease to get started.
            </p>
            <Link
              href="/"
              className="inline-block bg-[var(--color-accent-signal)] text-[var(--color-bg-base)] px-6 py-3 font-mono text-xs tracking-widest uppercase font-semibold"
            >
              UPLOAD LEASE →
            </Link>
          </div>
        )}

        <div className="space-y-px">
          {entries.map((e) => (
            <div
              key={e.id}
              className="grid grid-cols-12 gap-4 items-center bg-[var(--color-bg-surface)] border border-[var(--color-divider)] p-6 hover:bg-[var(--color-bg-elevated)] transition"
            >
              <div className="col-span-1 font-display text-4xl" style={{ color: recColors[e.recommendation] }}>
                {e.score}
              </div>
              <div className="col-span-6 md:col-span-5">
                <div className="font-display text-xl leading-tight break-words">{e.filename}</div>
                <div className="font-mono text-[10px] tracking-widest uppercase text-[var(--color-ink-tertiary)] mt-1">
                  {new Date(e.analyzed_at).toLocaleString()}
                </div>
              </div>
              <div className="col-span-3 font-mono text-[10px] tracking-widest uppercase" style={{ color: recColors[e.recommendation] }}>
                → {e.recommendation.replace(/_/g, " ")}
              </div>
              <div className="col-span-2 md:col-span-3 flex gap-2 justify-end">
                <Link
                  href={`/analyze/${e.id}`}
                  className="font-mono text-[10px] tracking-widest uppercase border border-[var(--color-divider)] px-3 py-2 hover:bg-[var(--color-bg-base)]"
                >
                  OPEN
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(e.id)}
                  className="font-mono text-[10px] tracking-widest uppercase border border-[var(--color-divider)] px-3 py-2 hover:border-[var(--color-risk-critical)] hover:text-[var(--color-risk-critical)]"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
