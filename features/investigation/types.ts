import type { AnalysisResult, CanvasMode } from "@/lib/ai/types";
import type { OllamaSettings } from "@/lib/ai/ollama";
import type { EvidenceRef, MonthKey, MonthRange } from "@/lib/analytics/types";

export type ModeId = CanvasMode;

export interface ModeDef {
  id: ModeId;
  n: string;
  title: string;
  short: string;
  question: string;
  exhibits: string;
}

/** An investigation case: the business, the period, and the lenses you can examine it through. */
export interface InvestigationCase {
  id: string;
  code: string;
  title: string;
  business: string;
  brief: string;
  modes: ModeDef[];
}

export interface Thread {
  id: string;
  title: string;
  createdAt: number;
  entries: AnalysisResult[];
}

export interface DrawerState {
  title: string;
  description?: string;
  /** Explicit evidence set. When absent, the drawer lists every order in range matching `query`. */
  orderIds?: string[];
  query?: string;
  source: string;
}

export interface EngineSettings {
  engine: "local" | "ollama";
  ollama: OllamaSettings;
}

export interface WorkspaceState {
  mode: ModeId;
  range: MonthRange;
  selection: EvidenceRef | null;
  /** Small screens: whether the selected-evidence panel is open full-screen. */
  detailOpen: boolean;
  compare: [MonthKey, MonthKey] | null;
  drawer: DrawerState | null;
  threads: Thread[];
  activeThreadId: string | null;
  settings: EngineSettings;
  /** Small screens: whether the investigator sheet is expanded. */
  aiOpen: boolean;
  settingsOpen: boolean;
  /** Progressive reveal of the newest result's working (not persisted). */
  reveal: { id: string; n: number } | null;
  /** Result id currently being narrated by Ollama (not persisted). */
  narrating: string | null;
}
