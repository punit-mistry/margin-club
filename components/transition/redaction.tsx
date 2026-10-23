"use client";

import type { AnimationEvent, CSSProperties } from "react";

/**
 * Redaction bars: the page gets blacked out line by line, like a document
 * being censored, then the bars retract to reveal what's underneath.
 *
 * One red bar — the line that doesn't add up — strikes first on the way in
 * and is the last to leave on the way out. It is the top row, behind the
 * logo, so it never sits under the (partly red) headline copy.
 */

export type RedactionState = "off" | "in" | "on" | "out";

const ROWS = 8;
const RED_ROW = 0;
// Stagger order per row (0 = first). Fixed, so every transition feels the same.
const IN_ORDER = [0, 3, 6, 1, 7, 2, 4, 5];
const OUT_ORDER = [7, 2, 5, 0, 4, 1, 6, 3];
const STEP_MS = 28;
const LAST_IN = IN_ORDER.indexOf(Math.max(...IN_ORDER));
const LAST_OUT = OUT_ORDER.indexOf(Math.max(...OUT_ORDER));

export function Redaction({
  state,
  onDone,
  outDelay = 0,
}: {
  state: RedactionState;
  onDone?: (state: "in" | "out") => void;
  /** Extra delay (ms) before the bars start retracting. */
  outDelay?: number;
}) {
  const end = (row: number) => (e: AnimationEvent) => {
    if (e.target !== e.currentTarget) return;
    if (state === "in" && row === LAST_IN) onDone?.("in");
    if (state === "out" && row === LAST_OUT) onDone?.("out");
  };
  return (
    <div className="redaction" data-state={state} aria-hidden>
      {Array.from({ length: ROWS }, (_, row) => (
        <span
          key={row}
          className="redaction-bar"
          data-red={row === RED_ROW || undefined}
          style={{ "--d-in": `${IN_ORDER[row] * STEP_MS}ms`, "--d-out": `${outDelay + OUT_ORDER[row] * STEP_MS}ms` } as CSSProperties}
          onAnimationEnd={end(row)}
        />
      ))}
    </div>
  );
}
