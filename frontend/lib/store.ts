"use client";

import { create } from "zustand";
import type { AnalysisData, StreamEvent } from "./api";

interface AnalysisState {
  current: AnalysisData | null;
  event: StreamEvent | null;
  analyzing: boolean;
  error: string | null;
  setCurrent: (d: AnalysisData | null) => void;
  setEvent: (e: StreamEvent | null) => void;
  setAnalyzing: (v: boolean) => void;
  setError: (s: string | null) => void;
  reset: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  current: null,
  event: null,
  analyzing: false,
  error: null,
  setCurrent: (current) => set({ current }),
  setEvent: (event) => set({ event }),
  setAnalyzing: (analyzing) => set({ analyzing }),
  setError: (error) => set({ error }),
  reset: () => set({ current: null, event: null, analyzing: false, error: null }),
}));
