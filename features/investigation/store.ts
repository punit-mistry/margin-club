"use client";

import { useSyncExternalStore } from "react";
import { investigate } from "@/lib/ai/engine";
import { DEFAULT_OLLAMA, narrate } from "@/lib/ai/ollama";
import type { AnalysisResult } from "@/lib/ai/types";
import { allMonths } from "@/lib/analytics/dataset";
import type { EvidenceRef, MonthKey, MonthRange } from "@/lib/analytics/types";
import type { DrawerState, EngineSettings, ModeId, Thread, WorkspaceState } from "./types";

/**
 * Workspace state lives in a tiny external store so any component can read it
 * with useSyncExternalStore. Preferences and investigation history persist to
 * localStorage; transient UI (selection, drawer) does not.
 */

const KEY = "margin-club:case-001:v1";
const MAX_THREADS = 30;

function defaults(): WorkspaceState {
  const months = allMonths();
  return {
    mode: "trap",
    range: { from: months[0], to: months[months.length - 1] },
    selection: null,
    detailOpen: false,
    compare: null,
    drawer: null,
    threads: [],
    activeThreadId: null,
    settings: { engine: "local", ollama: DEFAULT_OLLAMA },
    aiOpen: false,
    settingsOpen: false,
    reveal: null,
    narrating: null,
  };
}

const SERVER_STATE = defaults();
let state: WorkspaceState = SERVER_STATE;
const listeners = new Set<() => void>();

type Persisted = Pick<WorkspaceState, "mode" | "range" | "threads" | "activeThreadId" | "settings">;

function validRange(r: unknown): r is MonthRange {
  const months = allMonths() as string[];
  return !!r && typeof r === "object" && months.includes((r as MonthRange).from) && months.includes((r as MonthRange).to) && (r as MonthRange).from <= (r as MonthRange).to;
}

function load() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<Persisted>;
    const base = defaults();
    state = {
      ...base,
      mode: saved.mode && ["trap", "products", "customers", "channels"].includes(saved.mode) ? saved.mode : base.mode,
      range: validRange(saved.range) ? saved.range : base.range,
      threads: Array.isArray(saved.threads) ? saved.threads.slice(0, MAX_THREADS) : [],
      activeThreadId: typeof saved.activeThreadId === "string" ? saved.activeThreadId : null,
      settings: saved.settings?.ollama ? { engine: saved.settings.engine === "ollama" ? "ollama" : "local", ollama: { ...DEFAULT_OLLAMA, ...saved.settings.ollama } } : base.settings,
    };
  } catch {
    // Private mode / corrupted storage: start fresh.
  }
}

if (typeof window !== "undefined") load();

function persist() {
  const p: Persisted = { mode: state.mode, range: state.range, threads: state.threads, activeThreadId: state.activeThreadId, settings: state.settings };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Quota or private mode — history simply won't survive a reload.
  }
}

function set(patch: Partial<WorkspaceState> | ((s: WorkspaceState) => Partial<WorkspaceState>)) {
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
  persist();
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useWorkspace(): WorkspaceState {
  return useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
}

export const getWorkspace = () => state;

/* ------------------------------------------------------------------ */
/* Investigator run loop                                               */
/* ------------------------------------------------------------------ */

let counter = 0;
let revealTimer: ReturnType<typeof setInterval> | null = null;
let onRevealed: (() => void) | null = null;

function finishReveal() {
  if (revealTimer) clearInterval(revealTimer);
  revealTimer = null;
  set({ reveal: null });
  const cb = onRevealed;
  onRevealed = null;
  cb?.();
}

/** Show the engine's working one step at a time. Purely presentational: the result is already computed. */
function revealSteps(id: string, total: number, done: () => void) {
  if (revealTimer) finishReveal();
  onRevealed = done;
  set({ reveal: { id, n: 0 } });
  revealTimer = setInterval(() => {
    const r = state.reveal;
    if (!r || r.id !== id || r.n >= total) return finishReveal();
    set({ reveal: { id, n: r.n + 1 } });
  }, 170);
}

async function narrateResult(id: string) {
  const result = state.threads.flatMap((t) => t.entries).find((e) => e.id === id);
  if (!result) return;
  const { model } = state.settings.ollama;
  set({ narrating: id });
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 90_000);
  try {
    const narration = await narrate(result, state.settings.ollama, ctrl.signal);
    actions.updateResult(id, { narration, engine: { kind: "ollama", model, status: "ok" } });
  } catch (e) {
    const error = (e as Error).name === "AbortError" ? "Ollama took longer than 90 s." : (e as Error).message || "Couldn't reach Ollama.";
    actions.updateResult(id, { engine: { kind: "ollama", model, status: "failed", error } });
  } finally {
    clearTimeout(timeout);
    if (state.narrating === id) set({ narrating: null });
  }
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

export const actions = {
  setMode(mode: ModeId) {
    set({ mode });
  },
  setRange(range: MonthRange) {
    set((s) => ({
      range,
      compare: s.compare && s.compare.every((m) => m >= range.from && m <= range.to) ? s.compare : null,
      selection: s.selection?.kind === "month" && (s.selection.id < range.from || s.selection.id > range.to) ? null : s.selection,
    }));
  },
  select(ref: EvidenceRef | null, open = true) {
    set({ selection: ref, detailOpen: ref ? open : false });
  },
  closeDetail() {
    set({ detailOpen: false });
  },
  setCompare(compare: [MonthKey, MonthKey] | null) {
    set({ compare: compare ? ([...compare].sort() as [MonthKey, MonthKey]) : null });
  },
  openDrawer(drawer: DrawerState) {
    // On small screens the investigator sheet would cover the drawer.
    set({ drawer, aiOpen: false });
  },
  closeDrawer() {
    set({ drawer: null });
  },
  setSettings(settings: EngineSettings) {
    set({ settings });
  },
  openSettings(open: boolean) {
    set({ settingsOpen: open });
  },
  setAiOpen(aiOpen: boolean) {
    set({ aiOpen });
  },
  /** Run a question through the investigator. Usable from anywhere in the UI. */
  ask(question: string) {
    const q = question.trim();
    if (!q) return;
    const s = state;
    const thread = s.threads.find((t) => t.id === s.activeThreadId);
    const prev = thread?.entries[thread.entries.length - 1];
    const now = Date.now();
    const id = `${now.toString(36)}${(counter++).toString(36)}`;
    const result = investigate(q, { range: s.range, previous: prev ? { intent: prev.intent, entities: prev.entities } : undefined }, id, now);
    actions.appendResult(result);
    // Point the evidence canvas at what the answer is about.
    const f = result.focus;
    set({
      aiOpen: true,
      detailOpen: false,
      ...(f ? { mode: f.mode } : {}),
      ...(f?.ref ? { selection: f.ref, detailOpen: false } : {}),
      ...(f?.compare && f.compare[0] !== f.compare[1] ? { compare: f.compare } : {}),
    });
    revealSteps(result.id, result.steps.length, () => {
      if (state.settings.engine === "ollama") void narrateResult(result.id);
    });
  },
  skipReveal() {
    finishReveal();
  },

  /* History */
  newThread() {
    set({ activeThreadId: null });
  },
  openThread(id: string) {
    set({ activeThreadId: id });
  },
  appendResult(result: AnalysisResult) {
    set((s) => {
      const active = s.threads.find((t) => t.id === s.activeThreadId);
      if (active) {
        const updated = { ...active, entries: [...active.entries, result] };
        return { threads: [updated, ...s.threads.filter((t) => t.id !== active.id)] };
      }
      const thread: Thread = { id: `T-${result.id}`, title: result.question, createdAt: result.createdAt, entries: [result] };
      return { threads: [thread, ...s.threads].slice(0, MAX_THREADS), activeThreadId: thread.id };
    });
  },
  updateResult(id: string, patch: Partial<AnalysisResult>) {
    set((s) => ({
      threads: s.threads.map((t) => (t.entries.some((e) => e.id === id) ? { ...t, entries: t.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) } : t)),
    }));
  },
  deleteThread(id: string) {
    set((s) => ({ threads: s.threads.filter((t) => t.id !== id), activeThreadId: s.activeThreadId === id ? null : s.activeThreadId }));
  },
  clearHistory() {
    set({ threads: [], activeThreadId: null });
  },

  /** Back to a clean case: filters, selections, comparisons and history. Engine settings are kept. */
  resetCase() {
    if (revealTimer) clearInterval(revealTimer);
    revealTimer = null;
    onRevealed = null;
    const d = defaults();
    set((s) => ({ ...d, settings: s.settings }));
  },
  narrate(id: string) {
    void narrateResult(id);
  },
};
