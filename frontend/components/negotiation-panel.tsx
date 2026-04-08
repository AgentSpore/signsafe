"use client";

import { useState } from "react";
import type { RiskClause } from "@/lib/api";
import { generateNegotiationEmail } from "@/lib/api";

export function NegotiationPanel({ clauses }: { clauses: RiskClause[] }) {
  const [open, setOpen] = useState(false);
  const [tone, setTone] = useState<"professional" | "firm" | "friendly">("firm");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState<{ subject: string; body: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const critical = clauses.filter((c) => c.severity >= 3);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await generateNegotiationEmail(critical, tone);
      setEmail(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate email");
    } finally {
      setLoading(false);
    }
  }

  async function copyEmail() {
    if (!email) return;
    await navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`);
  }

  if (critical.length === 0) return null;

  return (
    <div className="border border-[var(--color-divider)] bg-[var(--color-bg-surface)] p-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left flex items-center justify-between font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-accent-signal)]"
      >
        <span>⚡ DRAFT NEGOTIATION EMAIL ({critical.length} clauses)</span>
        <span>{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <div className="flex gap-2">
            {(["professional", "firm", "friendly"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTone(t)}
                className={`font-mono text-[10px] uppercase tracking-widest px-3 py-2 border ${
                  tone === t
                    ? "border-[var(--color-accent-signal)] text-[var(--color-accent-signal)]"
                    : "border-[var(--color-divider)] text-[var(--color-ink-tertiary)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="w-full bg-[var(--color-accent-signal)] text-[var(--color-bg-base)] px-4 py-3 font-mono text-xs tracking-widest uppercase font-semibold disabled:opacity-60"
          >
            {loading ? "GENERATING…" : email ? "REGENERATE" : "GENERATE EMAIL"}
          </button>

          {error && (
            <div className="border border-[var(--color-risk-critical)] p-3 font-mono text-[10px] text-[var(--color-risk-critical)]">
              {error}
            </div>
          )}

          {email && (
            <div className="space-y-3 border-t border-[var(--color-divider)] pt-4">
              <div>
                <div className="font-mono text-[10px] tracking-widest uppercase text-[var(--color-ink-tertiary)] mb-1">SUBJECT</div>
                <div className="font-body text-sm">{email.subject}</div>
              </div>
              <div>
                <div className="font-mono text-[10px] tracking-widest uppercase text-[var(--color-ink-tertiary)] mb-1">BODY</div>
                <pre className="font-body text-xs text-[var(--color-ink-secondary)] whitespace-pre-wrap leading-relaxed">
                  {email.body}
                </pre>
              </div>
              <button
                type="button"
                onClick={copyEmail}
                className="w-full border border-[var(--color-divider)] px-4 py-2 font-mono text-[10px] tracking-widest uppercase hover:bg-[var(--color-bg-elevated)]"
              >
                ⧉ COPY TO CLIPBOARD
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
