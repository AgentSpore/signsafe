"use client";

import { useEffect, useState } from "react";
import {
  clearSession,
  consumeMagicToken,
  getSession,
  pullSync,
  pushSync,
  requestMagicLink,
  saveSession,
  type SessionInfo,
} from "@/lib/sync";
import { useLocale } from "./locale-provider";

type Step = "idle" | "email" | "token" | "linked";

export function SyncPanel({ onSynced }: { onSynced?: () => void } = {}) {
  const { t } = useLocale();
  const [step, setStep] = useState<Step>("idle");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [devToken, setDevToken] = useState<string | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const s = getSession();
    if (s) {
      setSession(s);
      setStep("linked");
      // Auto-pull on mount
      pullSync().then(
        (r) => {
          if (r.merged) {
            setStatus(`Synced — ${r.count} analyses`);
            onSynced?.();
          }
        },
        () => {},
      );
    }
  }, []);

  async function handleRequestLink() {
    setBusy(true);
    setError(null);
    try {
      const res = await requestMagicLink(email);
      if (res.dev_mode && res.token) {
        setDevToken(res.token);
      } else {
        setDevToken(null);
        setStatus(t("sync.emailSent"));
      }
      setStep("token");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleConsume(code?: string) {
    setBusy(true);
    setError(null);
    try {
      const info = await consumeMagicToken(code || token);
      saveSession(info);
      setSession(info);
      setStep("linked");
      const r = await pullSync().catch(() => ({ merged: false, count: 0 }));
      setStatus(r.merged ? `Synced — ${r.count} analyses pulled` : "Linked. No cloud data yet.");
      onSynced?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid token");
    } finally {
      setBusy(false);
    }
  }

  async function handleSyncNow() {
    setBusy(true);
    setError(null);
    setStatus("Syncing...");
    try {
      await pushSync();
      const r = await pullSync();
      setStatus(`Synced at ${new Date().toLocaleTimeString()} — ${r.count || "local"} items`);
      onSynced?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  function handleSignOut() {
    clearSession();
    setSession(null);
    setStep("idle");
    setEmail("");
    setToken("");
    setDevToken(null);
    setStatus(null);
  }

  if (step === "linked" && session) {
    return (
      <div className="border border-[var(--color-divider)] bg-[var(--color-bg-surface)] p-6 space-y-3">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-accent-signal)]">
          {t("sync.active")}
        </div>
        <div className="font-body text-sm text-[var(--color-ink-primary)] break-all">
          {session.email}
        </div>
        {status && (
          <div className="font-mono text-[10px] text-[var(--color-ink-tertiary)]">{status}</div>
        )}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={busy}
            className="flex-1 border border-[var(--color-divider)] py-2 font-mono text-[10px] tracking-widest uppercase hover:bg-[var(--color-bg-elevated)] disabled:opacity-50"
          >
            {busy ? "..." : t("sync.now")}
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex-1 border border-[var(--color-divider)] py-2 font-mono text-[10px] tracking-widest uppercase hover:border-[var(--color-risk-critical)] hover:text-[var(--color-risk-critical)]"
          >
            {t("sync.signOut")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-[var(--color-divider)] bg-[var(--color-bg-surface)] p-6 space-y-4">
      <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink-tertiary)]">
        {t("sync.title")}
      </div>
      <p className="font-body text-xs text-[var(--color-ink-secondary)] leading-relaxed">
        {t("sync.intro")}
      </p>

      {step === "idle" && (
        <button
          type="button"
          onClick={() => setStep("email")}
          className="w-full bg-[var(--color-accent-electric)] text-[var(--color-ink-primary)] py-3 font-mono text-[10px] tracking-widest uppercase font-semibold hover:bg-[var(--color-ink-primary)] hover:text-[var(--color-bg-base)]"
        >
          {t("sync.linkEmail")}
        </button>
      )}

      {step === "email" && (
        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("sync.emailPlaceholder")}
            className="w-full bg-[var(--color-bg-base)] border border-[var(--color-divider)] px-3 py-2 font-body text-sm text-[var(--color-ink-primary)] focus:border-[var(--color-accent-signal)] outline-none"
          />
          <button
            type="button"
            onClick={handleRequestLink}
            disabled={busy || !email.includes("@")}
            className="w-full bg-[var(--color-accent-signal)] text-[var(--color-bg-base)] py-2 font-mono text-[10px] tracking-widest uppercase font-semibold disabled:opacity-50"
          >
            {busy ? t("sync.sending") : t("sync.sendLink")}
          </button>
        </div>
      )}

      {step === "token" && (
        <div className="space-y-3">
          {devToken && (
            <div className="border border-[var(--color-accent-electric)] p-3 space-y-2">
              <div className="font-mono text-[9px] tracking-widest uppercase text-[var(--color-accent-electric)]">
                {t("sync.devMode")}
              </div>
              <div className="font-mono text-[10px] break-all text-[var(--color-ink-primary)]">
                {devToken}
              </div>
              <button
                type="button"
                onClick={() => handleConsume(devToken)}
                className="w-full bg-[var(--color-accent-signal)] text-[var(--color-bg-base)] py-2 font-mono text-[10px] tracking-widest uppercase font-semibold"
              >
                {t("sync.useToken")}
              </button>
            </div>
          )}
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={t("sync.tokenPlaceholder")}
            className="w-full bg-[var(--color-bg-base)] border border-[var(--color-divider)] px-3 py-2 font-mono text-xs text-[var(--color-ink-primary)] focus:border-[var(--color-accent-signal)] outline-none"
          />
          <button
            type="button"
            onClick={() => handleConsume()}
            disabled={busy || !token}
            className="w-full border border-[var(--color-accent-signal)] text-[var(--color-accent-signal)] py-2 font-mono text-[10px] tracking-widest uppercase disabled:opacity-50"
          >
            {busy ? "..." : t("sync.verify")}
          </button>
        </div>
      )}

      {error && (
        <div className="border border-[var(--color-risk-critical)] p-2 font-mono text-[10px] text-[var(--color-risk-critical)]">
          {error}
        </div>
      )}
    </div>
  );
}
