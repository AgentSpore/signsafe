"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { consumeMagicToken, saveSession, pullSync } from "@/lib/sync";

function VerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "ok" | "error">("verifying");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setError("Missing token");
      setStatus("error");
      return;
    }
    (async () => {
      try {
        const info = await consumeMagicToken(token);
        saveSession(info);
        await pullSync().catch(() => {});
        setStatus("ok");
        setTimeout(() => router.push("/history"), 1500);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Verification failed");
        setStatus("error");
      }
    })();
  }, [params, router]);

  return (
    <div className="max-w-md text-center space-y-4">
      <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)]">
        MAGIC LINK · {status.toUpperCase()}
      </div>
      {status === "verifying" && <h1 className="font-display text-5xl">Verifying…</h1>}
      {status === "ok" && (
        <>
          <h1 className="font-display text-5xl text-[var(--color-accent-signal)]">Linked.</h1>
          <p className="font-body text-[var(--color-ink-secondary)]">
            Pulling your archive… redirecting to history.
          </p>
        </>
      )}
      {status === "error" && (
        <>
          <h1 className="font-display text-5xl text-[var(--color-risk-critical)]">Failed.</h1>
          <p className="font-body text-[var(--color-ink-secondary)]">{error}</p>
          <Link
            href="/history"
            className="inline-block border border-[var(--color-divider)] px-6 py-3 font-mono text-xs tracking-widest uppercase hover:bg-[var(--color-bg-surface)]"
          >
            ← BACK TO HISTORY
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-ink-primary)] flex items-center justify-center p-8">
      <Suspense
        fallback={
          <div className="font-mono text-xs tracking-widest uppercase text-[var(--color-ink-tertiary)]">
            LOADING…
          </div>
        }
      >
        <VerifyInner />
      </Suspense>
    </main>
  );
}
