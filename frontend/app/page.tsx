"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { streamAnalysis } from "@/lib/api";
import { saveAnalysis, savePDFBytes } from "@/lib/storage";
import { IndustrySelector } from "@/components/industry-selector";
import { DemoButton } from "@/components/demo-button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useLocale } from "@/components/locale-provider";
import type { Industry } from "@/lib/industry";

export default function HomePage() {
  const router = useRouter();
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [industry, setIndustry] = useState<Industry | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setLoading(true);
    setStage("uploading");
    setProgress(5);
    try {
      const pdfBuf = await file.arrayBuffer();
      for await (const ev of streamAnalysis(file, industry)) {
        setStage(ev.stage);
        setProgress(ev.progress);
        if (ev.stage === "done" && ev.data) {
          const id = saveAnalysis(ev.data);
          savePDFBytes(id, pdfBuf);
          router.push(`/analyze/${id}`);
          return;
        }
        if (ev.stage === "error") {
          setError(ev.message);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-ink-primary)]">
      <div className="fixed inset-0 grid-lines pointer-events-none opacity-40" />

      <header className="relative border-b border-[var(--color-divider)]">
        <div className="max-w-[1400px] mx-auto px-8 py-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 border-2 border-[var(--color-ink-primary)] flex items-center justify-center font-mono text-xs font-bold">
              §
            </div>
            <span className="font-mono text-sm tracking-widest uppercase">SignSafe</span>
          </Link>
          <nav className="flex items-center gap-6 font-mono text-xs tracking-widest uppercase text-[var(--color-ink-secondary)]">
            <a href="#how" className="hidden md:inline hover:text-[var(--color-ink-primary)] transition">{t("nav.how")}</a>
            <a href="#patterns" className="hidden md:inline hover:text-[var(--color-ink-primary)] transition">{t("nav.patterns")}</a>
            <Link href="/history" className="hover:text-[var(--color-ink-primary)] transition">{t("nav.history")}</Link>
            <LocaleSwitcher />
          </nav>
        </div>
      </header>

      <section className="relative max-w-[1400px] mx-auto px-8 pt-24 pb-32">
        <div className="grid grid-cols-12 gap-8">
          <aside className="col-span-12 md:col-span-3 space-y-8 reveal-up">
            <div>
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)]">
                LEASE FORENSICS
              </div>
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)]">
                VOL. 01 / 2026
              </div>
            </div>
            <div className="h-px bg-[var(--color-divider)]" />
            <div className="font-mono text-[10px] tracking-[0.15em] uppercase text-[var(--color-ink-secondary)] leading-relaxed">
              FOR<br />
              FIRST-TIME<br />
              COMMERCIAL<br />
              TENANTS
            </div>
            <div className="h-px bg-[var(--color-divider)]" />
            <div className="space-y-2">
              <div className="font-mono text-[10px] tracking-widest text-[var(--color-ink-tertiary)]">STATS</div>
              <div className="font-display text-4xl">40</div>
              <div className="font-mono text-[10px] text-[var(--color-ink-secondary)]">
                PREDATORY PATTERNS<br />DETECTED
              </div>
            </div>
            <div className="h-px bg-[var(--color-divider)]" />
            <div className="space-y-2">
              <div className="font-mono text-[10px] tracking-widest text-[var(--color-ink-tertiary)]">PRIVACY</div>
              <div className="font-body text-xs text-[var(--color-ink-secondary)] leading-relaxed">
                Stateless. Your PDF is analyzed in memory and discarded. Results stored only in your browser.
              </div>
            </div>
          </aside>

          <div className="col-span-12 md:col-span-9">
            <h1 className="font-display font-normal text-[clamp(3.5rem,10vw,8.5rem)] leading-[0.88] tracking-[-0.035em] reveal-up">
              FIRST LEASE?<br />
              <span className="italic text-[var(--color-accent-signal)]">DON&rsquo;T</span>{" "}
              SIGN<br />
              BLIND.
            </h1>

            <div className="mt-12 grid grid-cols-12 gap-8">
              <p className="col-span-12 md:col-span-7 font-body text-xl md:text-2xl leading-relaxed text-[var(--color-ink-secondary)] reveal-up">
                Commercial leases hide <span className="text-[var(--color-ink-primary)]">$40K traps</span>{" "}
                in 80-page boilerplate. Unlimited guarantees, holdover double-rent,
                relocation clauses that move you into a closet. We find them in{" "}
                <span className="text-[var(--color-accent-signal)] font-mono text-base align-middle">
                  ≈3 MIN
                </span>
                .
              </p>

              <div className="col-span-12 md:col-span-5 md:border-l md:border-[var(--color-divider)] md:pl-8 space-y-4 reveal-up">
                <div className="font-mono text-[10px] tracking-widest uppercase text-[var(--color-ink-tertiary)]">
                  WHAT WE FIND
                </div>
                <ul className="space-y-2 font-body text-sm">
                  <li className="flex gap-3"><span className="font-mono text-[var(--color-risk-critical)]">●</span>Unlimited personal guarantees</li>
                  <li className="flex gap-3"><span className="font-mono text-[var(--color-risk-critical)]">●</span>200% holdover penalties</li>
                  <li className="flex gap-3"><span className="font-mono text-[var(--color-risk-warning)]">●</span>Uncapped CAM pass-through</li>
                  <li className="flex gap-3"><span className="font-mono text-[var(--color-risk-warning)]">●</span>Rent acceleration on default</li>
                  <li className="flex gap-3"><span className="font-mono text-[var(--color-risk-caution)]">●</span>Auto-renewal traps</li>
                </ul>
              </div>
            </div>

            <div className="mt-16 reveal-up">
              <IndustrySelector value={industry} onChange={setIndustry} />
            </div>

            <div className="mt-8 reveal-up">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file && !loading) handleFile(file);
                }}
                className={`border-2 ${
                  dragging
                    ? "border-[var(--color-accent-signal)] bg-[var(--color-bg-surface)]"
                    : "border-[var(--color-divider)] bg-transparent"
                } border-dashed p-12 md:p-16 transition-colors`}
              >
                {!loading ? (
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                    <div>
                      <div className="font-mono text-[10px] tracking-widest uppercase text-[var(--color-ink-tertiary)] mb-2">
                        STEP 02 / UPLOAD
                      </div>
                      <div className="font-display text-3xl md:text-4xl">
                        Drop your lease PDF.
                      </div>
                      <div className="font-body text-[var(--color-ink-secondary)] mt-2">
                        Up to 10MB · processed in memory · never stored on server.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="bg-[var(--color-accent-signal)] text-[var(--color-bg-base)] px-8 py-5 font-mono text-sm tracking-widest uppercase font-semibold hover:bg-[var(--color-ink-primary)] transition-colors"
                    >
                      SELECT FILE →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="font-mono text-[10px] tracking-widest uppercase text-[var(--color-ink-tertiary)]">
                      STAGE · {stage.toUpperCase()}
                    </div>
                    <div className="font-display text-3xl md:text-4xl">
                      {stage === "analyzing" ? "Running forensics…" : stage === "extracting" ? "Reading your PDF…" : "Uploading…"}
                    </div>
                    <div className="h-[3px] bg-[var(--color-bg-elevated)]">
                      <div
                        className="h-full bg-[var(--color-accent-signal)] transition-[width] duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="font-mono text-[10px] text-[var(--color-ink-tertiary)]">
                      {progress.toString().padStart(3, "0")} / 100
                    </div>
                  </div>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
              </div>

              {error && (
                <div className="mt-4 border border-[var(--color-risk-critical)] px-4 py-3 font-mono text-xs text-[var(--color-risk-critical)]">
                  ERROR // {error}
                </div>
              )}

              <div className="mt-6 text-center">
                <DemoButton />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="relative border-t border-[var(--color-divider)]">
        <div className="max-w-[1400px] mx-auto px-8 py-24">
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-4">
            § 02 / HOW IT WORKS
          </div>
          <h2 className="font-display text-5xl md:text-7xl leading-[0.9] mb-16 max-w-3xl">
            Three steps. Zero data retention. One clear verdict.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[var(--color-divider)]">
            {[
              { num: "01", title: "Extract", body: "PyMuPDF parses every page. Your file lives in RAM for seconds, then is discarded." },
              { num: "02", title: "Forensics", body: "Free open-source LLMs cross-reference 40 predatory patterns against your exact text." },
              { num: "03", title: "Verdict", body: "Risk score, recommendation, counter-language. Saved to your browser only." },
            ].map((s) => (
              <div key={s.num} className="bg-[var(--color-bg-base)] p-10">
                <div className="font-display text-7xl text-[var(--color-accent-electric)] mb-6">{s.num}</div>
                <div className="font-mono text-[10px] tracking-widest uppercase text-[var(--color-ink-tertiary)] mb-2">STAGE</div>
                <div className="font-display text-3xl mb-4">{s.title}</div>
                <div className="font-body text-[var(--color-ink-secondary)] leading-relaxed">{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="patterns" className="relative border-t border-[var(--color-divider)]">
        <div className="max-w-[1400px] mx-auto px-8 py-24">
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-4">
            § 03 / SEVERITY SCALE
          </div>
          <h2 className="font-display text-5xl md:text-7xl leading-[0.9] mb-16 max-w-3xl">
            We don&rsquo;t sugarcoat. <span className="italic">Red means red.</span>
          </h2>

          <div className="space-y-0 border-t border-[var(--color-divider)]">
            {[
              { level: 1, label: "INFO", color: "var(--color-ink-tertiary)", desc: "Informational — standard clause, no action needed." },
              { level: 2, label: "CAUTION", color: "var(--color-risk-caution)", desc: "Worth discussing — minor friction, usually fixable." },
              { level: 3, label: "WARNING", color: "var(--color-risk-warning)", desc: "Meaningful risk — negotiate before signing." },
              { level: 4, label: "CRITICAL", color: "var(--color-risk-critical)", desc: "Red flag — refuse without amendment." },
              { level: 5, label: "DEAL-BREAKER", color: "var(--color-risk-deal-breaker)", desc: "Do not sign as-is. Walk away if landlord won't budge." },
            ].map((r) => (
              <div key={r.level} className="grid grid-cols-12 gap-4 border-b border-[var(--color-divider)] py-6 items-center">
                <div className="col-span-2 md:col-span-1 font-mono text-xs text-[var(--color-ink-tertiary)]">0{r.level}</div>
                <div className="col-span-3 md:col-span-2">
                  <div className="h-2" style={{ background: r.color, width: `${r.level * 20}%` }} />
                </div>
                <div className="col-span-7 md:col-span-2 font-mono text-sm font-semibold tracking-widest" style={{ color: r.color }}>
                  {r.label}
                </div>
                <div className="col-span-12 md:col-span-7 font-body text-[var(--color-ink-secondary)]">{r.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--color-divider)]">
        <div className="max-w-[1400px] mx-auto px-8 py-12 flex flex-col md:flex-row justify-between items-start gap-6">
          <div>
            <div className="font-display text-2xl mb-2">SignSafe</div>
            <div className="font-mono text-[10px] tracking-widest uppercase text-[var(--color-ink-tertiary)]">
              LEASE FORENSICS · 2026 · STATELESS
            </div>
          </div>
          <div className="font-mono text-[10px] tracking-widest uppercase text-[var(--color-ink-tertiary)] max-w-md text-right">
            EDUCATIONAL TOOL · NOT LEGAL ADVICE · CONSULT A LICENSED ATTORNEY FOR CRITICAL DECISIONS
          </div>
        </div>
      </footer>
    </main>
  );
}
