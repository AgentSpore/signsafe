"use client";

import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { deriveSeveritySummary, type AnalysisData } from "./api";

const KEY_INDEX = "signsafe:index";
const KEY_ITEM = (id: string) => `signsafe:doc:${id}`;
const KEY_PDF = (id: string) => `signsafe:pdf:${id}`;
const MAX_HISTORY = 20;

// Session-scoped PDF bytes (not persisted to localStorage — too large, and privacy)
export function savePDFBytes(id: string, bytes: ArrayBuffer): void {
  if (typeof window === "undefined") return;
  try {
    const blob = new Blob([bytes], { type: "application/pdf" });
    const reader = new FileReader();
    reader.onload = () => {
      try {
        sessionStorage.setItem(KEY_PDF(id), reader.result as string);
      } catch (e) {
        console.warn("PDF too large for sessionStorage", e);
      }
    };
    reader.readAsDataURL(blob);
  } catch {}
}

export function loadPDFBytes(id: string): ArrayBuffer | null {
  if (typeof window === "undefined") return null;
  const dataUrl = sessionStorage.getItem(KEY_PDF(id));
  if (!dataUrl) return null;
  try {
    const base64 = dataUrl.split(",")[1];
    const raw = atob(base64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes.buffer;
  } catch {
    return null;
  }
}

export interface HistoryEntry {
  id: string;
  filename: string;
  /** Count of severity 4-5 findings. Replaces the removed 0-100 score. */
  critical_count: number;
  /** Null when the model abstained from an overall verdict. */
  recommendation: string | null;
  analyzed_at: string;
  /** Legacy: entries written before RU v1 still carry a score. Read-only. */
  score?: number | null;
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

// There is deliberately no cloud push. Cross-device sync was removed: it required an
// email (breaking the no-account promise), its "encryption" used a key derived from that
// same server-stored email, and it had no deletion path. localStorage below is now the
// ONLY place a result is ever stored — see src/signsafe/services/outbound.py.

export function saveAnalysis(data: AnalysisData): string {
  if (typeof window === "undefined") return "";
  const id = randomId();
  const analyzed_at = new Date().toISOString();
  const full = { ...data, id, analyzed_at };
  try {
    localStorage.setItem(KEY_ITEM(id), JSON.stringify(full));
    const raw = localStorage.getItem(KEY_INDEX);
    const index: HistoryEntry[] = raw ? JSON.parse(raw) : [];
    index.unshift({
      id,
      filename: data.filename,
      critical_count:
        data.severity_summary?.critical ?? deriveSeveritySummary(data.risk_clauses).critical,
      recommendation: data.recommendation ?? null,
      analyzed_at,
    });
    // Cap history and remove old entries
    const trimmed = index.slice(0, MAX_HISTORY);
    for (const removed of index.slice(MAX_HISTORY)) {
      localStorage.removeItem(KEY_ITEM(removed.id));
    }
    localStorage.setItem(KEY_INDEX, JSON.stringify(trimmed));
  } catch (e) {
    console.error("storage failed", e);
  }
  return id;
}

export function loadAnalysis(id: string): (AnalysisData & { id: string; analyzed_at: string }) | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY_ITEM(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEY_INDEX);
  return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
}

export function deleteAnalysis(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY_ITEM(id));
  const index = loadHistory().filter((e) => e.id !== id);
  localStorage.setItem(KEY_INDEX, JSON.stringify(index));
}

export function clearAllHistory(): void {
  if (typeof window === "undefined") return;
  // Remove ALL signsafe:* localStorage keys (docs, indexes, translation caches, UI caches)
  // to ensure a clean slate — useful when users have stale data from pre-v0.5.3 deploys.
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("signsafe:") && !k.startsWith("signsafe:session") && k !== "signsafe:email" && k !== "signsafe:locale") {
      toRemove.push(k);
    }
  }
  toRemove.forEach((k) => localStorage.removeItem(k));
  // Also clear sessionStorage (PDF bytes)
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const k = sessionStorage.key(i);
    if (k && k.startsWith("signsafe:")) sessionStorage.removeItem(k);
  }
}

/** Compress analysis into URL fragment for sharing. */
export function encodeShareFragment(data: AnalysisData): string {
  return compressToEncodedURIComponent(JSON.stringify(data));
}

export function decodeShareFragment(fragment: string): AnalysisData | null {
  try {
    const raw = decompressFromEncodedURIComponent(fragment);
    return raw ? (JSON.parse(raw) as AnalysisData) : null;
  } catch {
    return null;
  }
}
