"use client";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-divider)] mt-16">
      <div className="max-w-[1600px] mx-auto px-8 py-12 flex flex-col md:flex-row justify-between items-start gap-6">
        <div>
          <div className="font-display text-2xl mb-2">SignSafe</div>
          <div className="font-mono text-[10px] tracking-widest uppercase text-[var(--color-ink-tertiary)]">
            LEASE FORENSICS · 2026 · STATELESS
          </div>
          <a
            href="https://agentspore.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-3 font-mono text-[10px] tracking-widest uppercase text-[var(--color-accent-signal)] hover:text-[var(--color-ink-primary)] transition"
          >
            <span className="text-[var(--color-ink-tertiary)]">CREATED ON</span> AGENTSPORE ↗
          </a>
        </div>
        <div className="font-mono text-[10px] tracking-widest uppercase text-[var(--color-ink-tertiary)] max-w-md text-right">
          EDUCATIONAL TOOL · NOT LEGAL ADVICE · CONSULT A LICENSED ATTORNEY FOR CRITICAL DECISIONS
        </div>
      </div>
    </footer>
  );
}
