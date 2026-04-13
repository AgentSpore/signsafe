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
import { DOCUMENT_TYPES, type Industry } from "@/lib/industry";

export default function HomePage() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [docType, setDocType] = useState<Industry | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setLoading(true);
    setStage("uploading");
    setProgress(5);
    try {
      const pdfBuf = await file.arrayBuffer();
      for await (const ev of streamAnalysis(file, docType)) {
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

  const isRu = locale === "ru";

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
                {t("hero.meta.label")}
              </div>
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)]">
                {t("hero.meta.vol")}
              </div>
            </div>
            <div className="h-px bg-[var(--color-divider)]" />
            <div className="font-mono text-[10px] tracking-[0.15em] uppercase text-[var(--color-ink-secondary)] leading-relaxed">
              {t("hero.meta.for")}
            </div>
            <div className="h-px bg-[var(--color-divider)]" />
            <div className="space-y-2">
              <div className="font-mono text-[10px] tracking-widest text-[var(--color-ink-tertiary)]">
                {t("hero.stats.label")}
              </div>
              <div className="font-display text-4xl">146</div>
              <div className="font-mono text-[10px] text-[var(--color-ink-secondary)]">
                {t("hero.stats.body")}
              </div>
            </div>
            <div className="h-px bg-[var(--color-divider)]" />
            <div className="space-y-2">
              <div className="font-mono text-[10px] tracking-widest text-[var(--color-ink-tertiary)]">
                {t("hero.privacy.label")}
              </div>
              <div className="font-body text-xs text-[var(--color-ink-secondary)] leading-relaxed">
                {t("hero.privacy.body")}
              </div>
            </div>
          </aside>

          <div className="col-span-12 md:col-span-9">
            <h1 className="font-display font-normal text-[clamp(3.5rem,10vw,8.5rem)] leading-[0.88] tracking-[-0.035em] reveal-up">
              {t("hero.heading.line1")}<br />
              <span className="italic text-[var(--color-accent-signal)]">{t("hero.heading.dont")}</span><br />
              {t("hero.heading.line3")}
            </h1>

            <div className="mt-12 grid grid-cols-12 gap-8">
              <p className="col-span-12 md:col-span-7 font-body text-xl md:text-2xl leading-relaxed text-[var(--color-ink-secondary)] reveal-up">
                {t("hero.lead")}{" "}
                <span className="text-[var(--color-accent-signal)] font-mono text-base align-middle">
                  {t("hero.lead.time")}
                </span>
                .
              </p>

              <div className="col-span-12 md:col-span-5 md:border-l md:border-[var(--color-divider)] md:pl-8 space-y-4 reveal-up">
                <div className="font-mono text-[10px] tracking-widest uppercase text-[var(--color-ink-tertiary)]">
                  {t("hero.whatWeFind")}
                </div>
                <ul className="space-y-2 font-body text-sm">
                  <li className="flex gap-3"><span className="font-mono text-[var(--color-risk-critical)]">●</span>{t("hero.find.guarantees")}</li>
                  <li className="flex gap-3"><span className="font-mono text-[var(--color-risk-critical)]">●</span>{t("hero.find.holdover")}</li>
                  <li className="flex gap-3"><span className="font-mono text-[var(--color-risk-warning)]">●</span>{t("hero.find.cam")}</li>
                  <li className="flex gap-3"><span className="font-mono text-[var(--color-risk-warning)]">●</span>{t("hero.find.acceleration")}</li>
                  <li className="flex gap-3"><span className="font-mono text-[var(--color-risk-caution)]">●</span>{t("hero.find.autoRenewal")}</li>
                </ul>
              </div>
            </div>

            {/* Document type selector */}
            <div className="mt-12 reveal-up">
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-4">
                {t("doctype.label")}
              </div>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {DOCUMENT_TYPES.map((dt) => (
                  <button
                    key={dt.id}
                    type="button"
                    onClick={() => setDocType(docType === dt.id ? null : dt.id)}
                    className={`text-left p-3 border transition-colors ${
                      docType === dt.id
                        ? "border-[var(--color-accent-signal)] bg-[var(--color-bg-surface)]"
                        : "border-[var(--color-divider)] hover:border-[var(--color-ink-tertiary)]"
                    }`}
                  >
                    <div className="font-mono text-[10px] tracking-widest uppercase leading-tight">
                      {isRu ? dt.labelRu : dt.labelEn}
                    </div>
                    <div className="font-mono text-[9px] text-[var(--color-ink-tertiary)] mt-1 leading-tight">
                      {isRu ? dt.hintRu : dt.hintEn}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Upload drop zone */}
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
                        {t("upload.step")}
                      </div>
                      <div className="font-display text-3xl md:text-4xl">
                        {t("upload.drop")}
                      </div>
                      <div className="font-body text-[var(--color-ink-secondary)] mt-2">
                        {t("upload.limits")}
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
                  ОШИБКА // {error}
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
            {t("how.title")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[var(--color-divider)]">
            {[
              { num: "01", title: t("how.extract"), body: t("how.extractBody") },
              { num: "02", title: t("how.forensics"), body: t("how.forensicsBody") },
              { num: "03", title: t("how.verdict"), body: t("how.verdictBody") },
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

      <section id="patterns" className="relative border-t border-[var(--color-divider)]">
        <div className="max-w-[1400px] mx-auto px-8 py-24">
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-4">
            {t("scale.section")}
          </div>
          <h2 className="font-display text-5xl md:text-7xl leading-[0.9] mb-16 max-w-3xl">
            {t("scale.title")}
          </h2>

          <div className="space-y-0 border-t border-[var(--color-divider)]">
            {[
              { level: 1, label: t("scale.info"), color: "var(--color-ink-tertiary)", desc: t("scale.info.desc") },
              { level: 2, label: t("scale.caution"), color: "var(--color-risk-caution)", desc: t("scale.caution.desc") },
              { level: 3, label: t("scale.warning"), color: "var(--color-risk-warning)", desc: t("scale.warning.desc") },
              { level: 4, label: t("scale.critical"), color: "var(--color-risk-critical)", desc: t("scale.critical.desc") },
              { level: 5, label: t("scale.dealBreaker"), color: "var(--color-risk-deal-breaker)", desc: t("scale.dealBreaker.desc") },
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

      <SiteFooter />
    </main>
  );
}
