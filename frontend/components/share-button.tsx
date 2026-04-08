"use client";

import { useState } from "react";
import type { AnalysisData } from "@/lib/api";
import { encodeShareFragment } from "@/lib/storage";
import { useLocale } from "./locale-provider";

export function ShareButton({ data }: { data: AnalysisData }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const fragment = encodeShareFragment(data);
    const url = `${window.location.origin}/shared#d=${fragment}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={copyLink}
      className="w-full border border-[var(--color-divider)] px-6 py-4 font-mono text-xs tracking-widest uppercase text-[var(--color-ink-secondary)] hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-ink-primary)] transition text-center"
    >
      {copied ? t("share.copied") : t("share.link")}
    </button>
  );
}
