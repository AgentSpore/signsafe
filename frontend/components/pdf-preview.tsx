"use client";

import { useEffect, useRef, useState } from "react";

interface PDFPreviewProps {
  pdfBytes: ArrayBuffer | null;
  targetPage: number | null;
}

export function PDFPreview({ pdfBytes, targetPage }: PDFPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);

  useEffect(() => {
    if (!pdfBytes) return;
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const doc = await pdfjs.getDocument({ data: pdfBytes.slice(0) }).promise;
        if (cancelled) return;
        setNumPages(doc.numPages);

        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = "";
        pageRefs.current.clear();

        for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
          const page = await doc.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.2 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.display = "block";

          const wrap = document.createElement("div");
          wrap.className = "relative border border-[var(--color-divider)] bg-white mb-4";
          const label = document.createElement("div");
          label.className =
            "absolute top-2 left-2 font-mono text-[9px] tracking-widest uppercase text-gray-500 bg-white/80 px-2 py-1";
          label.textContent = `PAGE ${pageNum}/${doc.numPages}`;
          wrap.appendChild(canvas);
          wrap.appendChild(label);
          container.appendChild(wrap);
          pageRefs.current.set(pageNum, wrap);

          const ctx = canvas.getContext("2d");
          if (ctx) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
          }
        }
        setLoaded(true);
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : "PDF load failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfBytes]);

  useEffect(() => {
    if (!loaded || !targetPage) return;
    const wrap = pageRefs.current.get(targetPage);
    if (wrap) {
      wrap.scrollIntoView({ behavior: "smooth", block: "start" });
      wrap.style.outline = "3px solid var(--color-accent-signal)";
      setTimeout(() => {
        wrap.style.outline = "";
      }, 1600);
    }
  }, [targetPage, loaded]);

  if (!pdfBytes) {
    return (
      <div className="border border-dashed border-[var(--color-divider)] p-8 text-center">
        <div className="font-mono text-[10px] tracking-widest uppercase text-[var(--color-ink-tertiary)]">
          PDF PREVIEW UNAVAILABLE · ANALYSIS WAS LOADED FROM HISTORY
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-[var(--color-risk-critical)] p-4 font-mono text-xs text-[var(--color-risk-critical)]">
        PDF RENDER ERROR · {error}
      </div>
    );
  }

  return (
    <div className="border border-[var(--color-divider)] bg-[var(--color-bg-surface)] p-4">
      <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)] mb-3">
        ─── SOURCE DOCUMENT · {numPages || "…"} PAGES ───
      </div>
      <div
        ref={containerRef}
        className="max-h-[75vh] overflow-y-auto space-y-4 bg-[var(--color-bg-base)] p-3"
      />
    </div>
  );
}
