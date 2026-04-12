"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { streamAnalysis } from "@/lib/api";
import { saveAnalysis, savePDFBytes } from "@/lib/storage";
import { DemoButton } from "@/components/demo-button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useLocale } from "@/components/locale-provider";
import { SiteFooter } from "@/components/site-footer";

export default function MedicalBillPage() {
  const router = useRouter();
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setLoading(true);
    setStage("uploading");
    setProgress(5);
    try {
      const pdfBuf = await file.arrayBuffer();
      for await (const ev of streamAnalysis(file, "medical_bill")) {
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
            <Link href="/lease" className="hidden md:inline hover:text-[var(--color-ink-primary)] transition">
              {t("nav.commercial")}
            </Link>
            <Link href="/elder-care" className="hidden md:inline hover:text-[var(--color-ink-primary)] transition">
              {t("nav.elderCare")}
            </Link>
            <a href="#how" className="hidden md:inline hover:text-[var(--color-ink-primary)] transition">
              {t("nav.how")}
            </a>
            <Link href="/history" className="hover:text-[var(--color-ink-primary)] transition">
              {t("nav.history")}
            </Link>
            <LocaleSwitcher />
          </nav>
        </div>
      </header>

      <section className="relative max-w-[1400px] mx-auto px-8 pt-24 pb-32">
        <div className="grid grid-cols-12 gap-8">
          <aside className="col-span-12 md:col-span-3 space-y-8 reveal-up">
            <div>
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)]">
                {t("medbill.meta.label")}
              </div>
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)]">
                {t("medbill.meta.vol")}
              </div>
            </div>
            <div className="h-px bg-[var(--color-divider)]" />
            <div className="font-mono text-[10px] tracking-[0.15em] uppercase text-[var(--color-ink-secondary)] leading-relaxed">
              {t("medbill.meta.for")}
            </div>
            <div className="h-px bg-[var(--color-divider)]" />
            <div className="space-y-2">
              <div className="font-mono text-[10px] tracking-widest text-[var(--color-ink-tertiary)]">
                {t("hero.stats.label")}
              </div>
              <div className="font-display text-4xl">25</div>
              <div className="font-mono text-[10px] text-[var(--color-ink-secondary)]">
                {t("medbill.stats.body")}
              </div>
            </div>
            <div className="h-px bg-[var(--color-divider)]" />
            <div className="space-y-2">
              <div className="font-mono text-[10px] tracking-widest text-[var(--color-ink-tertiary)]">
                {t("hero.privacy.label")}
              </div>
              <div className="font-body text-xs text-[var(--color-ink-secondary)] leading-relaxed">
                {t("medbill.privacy.body")}
              </div>
            </div>
            <div className="h-px bg-[var(--color-divider)]" />
            <Link
              href="/"
              className="block font-mono text-[10px] tracking-widest uppercase text-[var(--color-ink-tertiary)] hover:text-[var(--color-accent-signal)] transition"
            >
              {t("medbill.cta.backToHub")}
            </Link>
          </aside>

          <div className="col-span-12 md:col-span-9">
            <h1 className="font-display font-normal text-[clamp(3.5rem,10vw,8.5rem)] leading-[0.88] tracking-[-0.035em] reveal-up">
              {t("medbill.heading.line1")}<br />
              <span className="italic text-[var(--color-risk-warning)]">{t("medbill.heading.line2")}</span><br />
              <span className="italic text-[var(--color-accent-signal)]">{t("medbill.heading.dont")}</span>{" "}
              {t("medbill.heading.line3")}
            </h1>

            <div className="mt-12 grid grid-cols-12 gap-8">
              <p className="col-span-12 md:col-span-7 font-body text-xl md:text-2xl leading-relaxed text-[var(--color-ink-secondary)] reveal-up">
                {t("medbill.lead")}{" "}
                <span className="text-[var(--color-accent-signal)] font-mono text-base align-middle">
                  {t("hero.lead.time")}
                </span>
                .
              </p>

              <div className="col-span-12 md:col-span-5 md:border-l md:border-[var(--color-divider)] md:pl-8 space-y-4 reveal-up">
                <div className="font-mono text-[10px] tracking-widest uppercase text-[var(--color-ink-tertiary)]">
                  {t("medbill.whatWeFind")}
                </div>
                <ul className="space-y-2 font-body text-sm">
                  <li className="flex gap-3"><span className="font-mono text-[var(--color-risk-critical)]">●</span>{t("medbill.find.duplicates")}</li>
                  <li className="flex gap-3"><span className="font-mono text-[var(--color-risk-critical)]">●</span>{t("medbill.find.upcoding")}</li>
                  <li className="flex gap-3"><span className="font-mono text-[var(--color-risk-warning)]">●</span>{t("medbill.find.unbundling")}</li>
                  <li className="flex gap-3"><span className="font-mono text-[var(--color-risk-critical)]">●</span>{t("medbill.find.balanceBilling")}</li>
                  <li className="flex gap-3"><span className="font-mono text-[var(--color-risk-warning)]">●</span>{t("medbill.find.phantom")}</li>
                </ul>
              </div>
            </div>

            <div className="mt-16 reveal-up">
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
                        {t("upload.step")}
                      </div>
                      <div className="font-display text-3xl md:text-4xl">
                        {t("medbill.upload.drop")}
                      </div>
                      <div className="font-body text-[var(--color-ink-secondary)] mt-2">
                        {t("medbill.upload.limits")}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="bg-[var(--color-accent-signal)] text-[var(--color-bg-base)] px-8 py-5 font-mono text-sm tracking-widest uppercase font-semibold hover:bg-[var(--color-ink-primary)] transition-colors"
                    >
                      {t("upload.select")}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="font-mono text-[10px] tracking-widest uppercase text-[var(--color-ink-tertiary)]">
                      {t("upload.stage")} · {stage.toUpperCase()} · {t("upload.timeHint")}
                    </div>
                    <div className="font-display text-3xl md:text-4xl">
                      {stage === "analyzing" ? t("upload.analyzing") : stage === "extracting" ? t("upload.extracting") : t("upload.uploading")}
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

              <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border-t-2 border-[var(--color-accent-signal)] pt-3">
                  <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-1">01</div>
                  <div className="font-body text-sm text-[var(--color-ink-secondary)]">{t("upload.step1")}</div>
                </div>
                <div className="border-t-2 border-[var(--color-accent-signal)] pt-3">
                  <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-1">02</div>
                  <div className="font-body text-sm text-[var(--color-ink-secondary)]">{t("upload.step2")}</div>
                </div>
                <div className="border-t-2 border-[var(--color-accent-signal)] pt-3">
                  <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-1">03</div>
                  <div className="font-body text-sm text-[var(--color-ink-secondary)]">{t("upload.step3")}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="relative border-t border-[var(--color-divider)]">
        <div className="max-w-[1400px] mx-auto px-8 py-24">
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-4">
            {t("how.section")}
          </div>
          <h2 className="font-display text-5xl md:text-7xl leading-[0.9] mb-16 max-w-3xl">
            {t("medbill.how.title")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[var(--color-divider)]">
            {[
              { num: "01", title: t("how.extract"), body: t("medbill.how.extractBody") },
              { num: "02", title: t("how.forensics"), body: t("medbill.how.forensicsBody") },
              { num: "03", title: t("how.verdict"), body: t("medbill.how.verdictBody") },
            ].map((s) => (
              <div key={s.num} className="bg-[var(--color-bg-base)] p-10">
                <div className="font-display text-7xl text-[var(--color-accent-electric)] mb-6">{s.num}</div>
                <div className="font-mono text-[10px] tracking-widest uppercase text-[var(--color-ink-tertiary)] mb-2">{t("how.stage")}</div>
                <div className="font-display text-3xl mb-4">{s.title}</div>
                <div className="font-body text-[var(--color-ink-secondary)] leading-relaxed">{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
