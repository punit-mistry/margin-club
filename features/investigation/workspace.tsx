"use client";

import { ChevronUp } from "lucide-react";
import { useEffect } from "react";
import { allMonths } from "@/lib/analytics/dataset";
import type { MonthKey } from "@/lib/analytics/types";
import { ChannelsCanvas } from "./canvases/channels-canvas";
import { CustomersCanvas } from "./canvases/customers-canvas";
import { ProductsCanvas } from "./canvases/products-canvas";
import { TrapCanvas } from "./canvases/trap-canvas";
import { EvidenceDetail } from "./evidence-detail";
import { EvidenceDrawer } from "./evidence-drawer";
import { Investigator } from "./investigator";
import { ModeTabs } from "./mode-tabs";
import { SettingsDialog } from "./settings-dialog";
import { actions, getWorkspace, useWorkspace } from "./store";
import { TopBar } from "./top-bar";
import type { ModeId } from "./types";

const MODES: ModeId[] = ["trap", "products", "customers", "channels"];

/**
 * Full-screen investigative workspace.
 *  ≥1280: canvas | selected evidence | investigator
 *  ≥1024: canvas | investigator, evidence slides over
 *  <1024: vertical investigation, evidence full-screen, investigator as a dock that expands
 */
export function Workspace() {
  const ws = useWorkspace();

  // Deep links from the public pages: /investigation#mode=products or #month=2026-08
  useEffect(() => {
    const raw = window.location.hash.slice(1);
    if (!raw) return;
    const params = new URLSearchParams(raw);
    const mode = params.get("mode") as ModeId | null;
    const month = params.get("month") as MonthKey | null;
    if (mode && MODES.includes(mode)) actions.setMode(mode);
    if (month && allMonths().includes(month)) {
      const r = getWorkspace().range;
      if (month < r.from || month > r.to) actions.setRange({ from: allMonths()[0], to: allMonths()[allMonths().length - 1] });
      actions.setMode("trap");
      actions.select({ kind: "month", id: month }, false);
    }
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const showDetail = !!(ws.selection || ws.compare) && ws.detailOpen;
  const lastEntry = ws.threads.find((t) => t.id === ws.activeThreadId)?.entries.at(-1);

  return (
    <div className="flex min-h-dvh flex-col bg-cream lg:h-dvh lg:overflow-hidden">
      <div className="sticky top-0 z-40 lg:static">
        <TopBar />
        <ModeTabs />
      </div>

      <div className="relative flex-1 lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_390px] xl:grid-cols-[minmax(0,1fr)_310px_390px]">
        <main id="evidence-canvas" className="@container min-w-0 px-4 pt-6 pb-32 sm:px-6 lg:overflow-y-auto lg:pb-20 xl:px-10 scrollbar-thin">
          {ws.mode === "trap" && <TrapCanvas />}
          {ws.mode === "products" && <ProductsCanvas />}
          {ws.mode === "customers" && <CustomersCanvas />}
          {ws.mode === "channels" && <ChannelsCanvas />}
          <p className="meta mt-16 border-t border-ink pt-3 text-ink-soft">
            Ordinary Objects is a fictional business. All orders are deterministic demo data generated for this case.
          </p>
        </main>

        <aside
          aria-label="Selected evidence"
          className={`${showDetail ? "flex" : "hidden"} fixed inset-0 z-[70] flex-col bg-cream lg:inset-auto lg:top-[88px] lg:right-[390px] lg:bottom-0 lg:w-[360px] lg:border-x lg:border-ink lg:shadow-[-10px_0_0_rgba(22,22,22,0.07)] xl:static xl:z-auto xl:flex xl:w-auto xl:border-r-0 xl:shadow-none`}
        >
          <EvidenceDetail />
        </aside>

        <aside
          aria-label="The investigator"
          className={`${ws.aiOpen ? "flex" : "hidden"} fixed inset-0 z-[65] flex-col lg:static lg:z-auto lg:flex lg:min-h-0 lg:border-l lg:border-ink`}
        >
          <Investigator onCollapse={() => actions.setAiOpen(false)} />
        </aside>
      </div>

      {/* Mobile dock */}
      {!ws.aiOpen && (
        <button
          type="button"
          onClick={() => actions.setAiOpen(true)}
          className="fixed inset-x-3 bottom-3 z-50 flex items-center justify-between gap-3 border-2 border-ink bg-ink px-4 py-3 text-left text-cream shadow-[4px_4px_0_#E74732] lg:hidden"
        >
          <span className="min-w-0">
            <span className="meta flex items-center gap-1.5 text-cream/70">
              <span className={`inline-block h-1.5 w-1.5 ${ws.reveal ? "animate-blink bg-signal" : "bg-electric"}`} /> The investigator
            </span>
            <span className="display block truncate text-[22px] leading-tight">{lastEntry ? lastEntry.headline : "Something doesn't add up."}</span>
          </span>
          <ChevronUp size={20} className="shrink-0" />
        </button>
      )}

      <EvidenceDrawer />
      <SettingsDialog />
    </div>
  );
}
