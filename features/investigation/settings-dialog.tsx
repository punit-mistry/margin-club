"use client";

import { Check, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Stamp } from "@/components/brand";
import { checkOllama, type OllamaStatus } from "@/lib/ai/ollama";
import { actions, useWorkspace } from "./store";

export function SettingsDialog() {
  const ws = useWorkspace();
  if (!ws.settingsOpen) return null;
  return <Dialog />;
}

function Dialog() {
  const ws = useWorkspace();
  const [engine, setEngine] = useState(ws.settings.engine);
  const [url, setUrl] = useState(ws.settings.ollama.url);
  const [model, setModel] = useState(ws.settings.ollama.model);
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && actions.openSettings(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const test = async () => {
    setTesting(true);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await checkOllama({ url, model }, ctrl.signal);
    clearTimeout(t);
    setStatus(res);
    setTesting(false);
  };

  const installed = status?.ok ? status.models : [];
  const modelInstalled = installed.some((m) => m === model || m.split(":")[0] === model);
  const canUseOllama = !!status?.ok && modelInstalled;

  const save = () => {
    actions.setSettings({ engine: engine === "ollama" && canUseOllama ? "ollama" : engine === "ollama" ? ws.settings.engine : "local", ollama: { url, model } });
    actions.openSettings(false);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Engine settings">
      <button type="button" aria-label="Close settings" className="absolute inset-0 bg-ink/50" onClick={() => actions.openSettings(false)} />
      <div className="relative max-h-[90dvh] w-full max-w-[560px] overflow-y-auto border-2 border-ink bg-cream p-5 shadow-[8px_8px_0_#161616] sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <span className="meta text-ink-soft">Settings</span>
            <h2 className="display text-[44px] leading-[0.9]">The engine room</h2>
          </div>
          <button type="button" onClick={() => actions.openSettings(false)} className="inline-flex h-8 w-8 items-center justify-center border border-ink hover:bg-ink hover:text-cream" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <fieldset className="mt-5 space-y-3">
          <legend className="meta mb-2 text-ink-soft">Who answers your questions</legend>
          <Option checked={engine === "local"} onChange={() => setEngine("local")} title="Local analysis engine" badge={<Stamp tone="blue" rotate={-2}>Default · free</Stamp>}>
            Rules and arithmetic over the case data, in your browser. Always available. Every figure in every answer comes from here — even when Ollama is on.
          </Option>
          <Option checked={engine === "ollama"} onChange={() => setEngine("ollama")} title="+ Ollama narrator (optional)" badge={<Stamp tone="ink" rotate={2}>Your machine</Stamp>}>
            A model running on your own computer via{" "}
            <a href="https://ollama.com" target="_blank" rel="noreferrer" className="underline">Ollama</a> rewrites the engine&apos;s findings in plain English. It is told to
            use only the engine&apos;s numbers; any number it adds is flagged.
          </Option>
        </fieldset>

        {engine === "ollama" && (
          <div className="mt-4 border border-ink p-4">
            <label className="block">
              <span className="meta text-ink-soft">Ollama URL</span>
              <input value={url} onChange={(e) => { setUrl(e.target.value); setStatus(null); }} className="mt-1 h-9 w-full border border-ink bg-cream px-2 font-mono text-[12.5px] outline-none focus:border-electric" />
            </label>
            <label className="mt-3 block">
              <span className="meta text-ink-soft">Model</span>
              <input value={model} onChange={(e) => setModel(e.target.value.trim())} className="mt-1 h-9 w-full border border-ink bg-cream px-2 font-mono text-[12.5px] outline-none focus:border-electric" placeholder="llama3.2" />
            </label>
            <button type="button" onClick={test} disabled={testing} className="mt-3 inline-flex items-center gap-2 border border-ink px-3 py-2 font-mono text-[11px] font-bold uppercase hover:bg-ink hover:text-cream disabled:opacity-50">
              {testing && <Loader2 size={13} className="animate-spin" />} Test connection
            </button>
            {status && (
              <div className={`mt-3 border-l-2 pl-3 text-[13px] leading-snug ${status.ok ? "border-electric" : "border-signal"}`}>
                {status.ok ? (
                  <>
                    <p className="flex items-center gap-1.5 font-semibold text-electric"><Check size={14} /> Connected · {status.models.length} model{status.models.length === 1 ? "" : "s"} installed</p>
                    {!modelInstalled && <p className="mt-1 text-signal">“{model}” isn&apos;t installed. Pick one below, or run <code className="font-mono">ollama pull {model}</code>.</p>}
                    {installed.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {installed.map((m) => (
                          <button key={m} type="button" onClick={() => setModel(m)} className={`border px-1.5 py-0.5 font-mono text-[10.5px] ${m === model ? "border-electric bg-electric text-cream" : "border-ink hover:bg-ink hover:text-cream"}`}>
                            {m}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-signal">Not connected. {status.error}</p>
                )}
              </div>
            )}
            {!status && <p className="meta mt-3 text-ink-soft normal-case tracking-normal">Test the connection before switching. MARGIN CLUB never pretends a model is connected.</p>}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="meta text-ink-soft normal-case tracking-normal">
            {engine === "ollama" && !canUseOllama ? "Ollama will be enabled once a test succeeds with an installed model." : "Saved in this browser."}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => actions.openSettings(false)} className="border border-ink px-4 py-2 font-mono text-[11px] font-bold uppercase hover:bg-ink hover:text-cream">Cancel</button>
            <button type="button" onClick={save} className="border border-ink bg-ink px-4 py-2 font-mono text-[11px] font-bold uppercase text-cream hover:bg-electric hover:border-electric">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Option({ checked, onChange, title, badge, children }: { checked: boolean; onChange: () => void; title: string; badge: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className={`flex cursor-pointer gap-3 border p-3 transition-colors ${checked ? "border-electric bg-electric/5" : "border-ink hover:bg-ink/5"}`}>
      <input type="radio" checked={checked} onChange={onChange} className="mt-1 accent-[#244BFF]" />
      <span>
        <span className="flex flex-wrap items-center gap-2">
          <span className="display text-[24px] leading-none">{title}</span>
          {badge}
        </span>
        <span className="mt-1 block text-[13px] leading-snug text-ink-soft">{children}</span>
      </span>
    </label>
  );
}
