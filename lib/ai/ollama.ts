import { resultToFacts } from "./engine";
import type { AnalysisResult } from "./types";

/**
 * Optional local LLM narration via Ollama (https://ollama.com).
 * The browser talks to the user's own Ollama server directly — nothing is
 * sent to any hosted service. The model only rewrites facts the local
 * engine already computed; it is told not to introduce new numbers.
 *
 * Ollama allows requests from localhost origins by default. When MARGIN CLUB
 * is served from another origin, start Ollama with OLLAMA_ORIGINS set.
 */

export interface OllamaSettings {
  url: string;
  model: string;
}

export const DEFAULT_OLLAMA: OllamaSettings = { url: "http://localhost:11434", model: "llama3.2" };

export type OllamaStatus =
  | { ok: true; models: string[] }
  | { ok: false; error: string };

function base(url: string) {
  return url.replace(/\/+$/, "");
}

export async function checkOllama(settings: OllamaSettings, signal?: AbortSignal): Promise<OllamaStatus> {
  try {
    const res = await fetch(`${base(settings.url)}/api/tags`, { signal });
    if (!res.ok) return { ok: false, error: `Ollama answered HTTP ${res.status}.` };
    const json = (await res.json()) as { models?: { name: string }[] };
    return { ok: true, models: (json.models ?? []).map((m) => m.name) };
  } catch (e) {
    if ((e as Error).name === "AbortError") return { ok: false, error: "Timed out." };
    return {
      ok: false,
      error: `Couldn't reach ${settings.url}. Is Ollama running? If this page isn't on localhost, start Ollama with OLLAMA_ORIGINS="${typeof window !== "undefined" ? window.location.origin : "*"}".`,
    };
  }
}

const SYSTEM = [
  "You are the narrator for MARGIN CLUB, a business investigation tool.",
  "Rewrite the FACTS below as a short, plain-English briefing for a small-business owner (max 110 words).",
  "Rules: use ONLY numbers that appear in the FACTS, copied exactly. Do not calculate, estimate or invent anything.",
  "No headings, no bullet lists, no greetings. Tone: calm, direct, like an investigative journalist.",
].join(" ");

export async function narrate(result: AnalysisResult, settings: OllamaSettings, signal?: AbortSignal): Promise<string> {
  const res = await fetch(`${base(settings.url)}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      model: settings.model,
      stream: false,
      options: { temperature: 0.2 },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: resultToFacts(result) },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text.includes("not found") ? `Model “${settings.model}” isn't installed. Run: ollama pull ${settings.model}` : `Ollama answered HTTP ${res.status}.`);
  }
  const json = (await res.json()) as { message?: { content?: string } };
  // Reasoning models (qwen3, deepseek-r1) prefix their answer with a <think> block.
  const content = json.message?.content?.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  if (!content) throw new Error("Ollama returned an empty response.");
  return content;
}

/**
 * Guard-rail: list numbers in the narration that do not appear in the facts.
 * Shown to the user so an LLM slip is visible, never silent.
 */
export function unverifiedNumbers(narration: string, result: AnalysisResult): string[] {
  const facts = resultToFacts(result);
  const norm = (s: string) => s.replace(/[₹,\s]/g, "").replace(/−/g, "-");
  const factNorm = norm(facts);
  const found = narration.match(/[₹−-]?\d[\d,]*(\.\d+)?\s?(%|L|K|Cr| pts)?/g) ?? [];
  return [...new Set(found.map((f) => f.trim()))].filter((f) => {
    const n = norm(f);
    if (/^\d$/.test(n)) return false; // single digits ("3 actions") are fine
    return !factNorm.includes(n.replace(/^-/, ""));
  });
}
