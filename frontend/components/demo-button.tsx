"use client";

import { useRouter } from "next/navigation";
import { DEMO_ANALYSIS } from "@/lib/demo";
import { saveAnalysis } from "@/lib/storage";
import { useLocale } from "./locale-provider";

export function DemoButton() {
  const router = useRouter();
  const { t } = useLocale();

  function loadDemo() {
    const id = saveAnalysis(DEMO_ANALYSIS);
    router.push(`/analyze/${id}`);
  }

  return (
    <button
      type="button"
      onClick={loadDemo}
      className="font-mono text-[10px] tracking-widest uppercase text-[var(--color-accent-signal)] underline decoration-dotted underline-offset-4 hover:text-[var(--color-ink-primary)] transition"
    >
      {t("demo.try")}
    </button>
  );
}
