"use client";

import type { AnalysisData } from "./api";
import { decryptForEmail, encryptForEmail } from "./crypto";
import { loadHistory, type HistoryEntry } from "./storage";

const KEY_SESSION = "signsafe:session";
const KEY_EMAIL = "signsafe:email";

export interface SessionInfo {
  email: string;
  session_token: string;
}

export function getSession(): SessionInfo | null {
  if (typeof window === "undefined") return null;
  const email = localStorage.getItem(KEY_EMAIL);
  const session_token = localStorage.getItem(KEY_SESSION);
  if (!email || !session_token) return null;
  return { email, session_token };
}

export function saveSession(info: SessionInfo): void {
  localStorage.setItem(KEY_EMAIL, info.email);
  localStorage.setItem(KEY_SESSION, info.session_token);
}

export function clearSession(): void {
  localStorage.removeItem(KEY_EMAIL);
  localStorage.removeItem(KEY_SESSION);
}

export async function requestMagicLink(
  email: string,
): Promise<{ token: string; dev_mode: boolean }> {
  const res = await fetch("/api/sync/magic-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(`Magic link failed: ${res.status}`);
  return res.json();
}

export async function consumeMagicToken(token: string): Promise<SessionInfo> {
  const res = await fetch("/api/sync/consume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) throw new Error("Invalid or expired magic link");
  return res.json();
}

interface FullArchive {
  version: 1;
  index: HistoryEntry[];
  documents: Record<string, AnalysisData & { id: string; analyzed_at: string }>;
}

function collectArchive(): FullArchive {
  const index = loadHistory();
  const documents: FullArchive["documents"] = {};
  for (const entry of index) {
    const raw = localStorage.getItem(`signsafe:doc:${entry.id}`);
    if (raw) {
      try {
        documents[entry.id] = JSON.parse(raw);
      } catch {}
    }
  }
  return { version: 1, index, documents };
}

function mergeArchives(local: FullArchive, remote: FullArchive): FullArchive {
  const byId = new Map<string, HistoryEntry>();
  for (const e of local.index) byId.set(e.id, e);
  for (const e of remote.index) {
    const existing = byId.get(e.id);
    if (!existing || new Date(e.analyzed_at) > new Date(existing.analyzed_at)) {
      byId.set(e.id, e);
    }
  }
  const mergedDocs = { ...remote.documents, ...local.documents };
  const index = Array.from(byId.values()).sort(
    (a, b) => new Date(b.analyzed_at).getTime() - new Date(a.analyzed_at).getTime(),
  );
  return { version: 1, index, documents: mergedDocs };
}

function applyArchive(archive: FullArchive): void {
  localStorage.setItem("signsafe:index", JSON.stringify(archive.index));
  for (const [id, doc] of Object.entries(archive.documents)) {
    localStorage.setItem(`signsafe:doc:${id}`, JSON.stringify(doc));
  }
}

export async function pushSync(): Promise<void> {
  const session = getSession();
  if (!session) return;
  const archive = collectArchive();
  const plaintext = JSON.stringify(archive);
  const { ciphertext, iv } = await encryptForEmail(session.email, plaintext);
  const res = await fetch("/api/sync/put", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_token: session.session_token, ciphertext, iv }),
  });
  if (!res.ok) {
    if (res.status === 401) clearSession();
    throw new Error(`Sync failed: ${res.status}`);
  }
}

export async function pullSync(): Promise<{ merged: boolean; count: number }> {
  const session = getSession();
  if (!session) return { merged: false, count: 0 };
  const res = await fetch("/api/sync/get", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_token: session.session_token }),
  });
  if (!res.ok) {
    if (res.status === 401) clearSession();
    throw new Error(`Pull failed: ${res.status}`);
  }
  const blob = await res.json();
  if (!blob.ciphertext || !blob.iv) return { merged: false, count: 0 };
  try {
    const plaintext = await decryptForEmail(session.email, blob.ciphertext, blob.iv);
    const remote = JSON.parse(plaintext) as FullArchive;
    const local = collectArchive();
    const merged = mergeArchives(local, remote);
    applyArchive(merged);
    return { merged: true, count: merged.index.length };
  } catch (e) {
    console.error("Failed to decrypt sync blob", e);
    throw new Error("Could not decrypt your cloud data. Wrong email?");
  }
}
