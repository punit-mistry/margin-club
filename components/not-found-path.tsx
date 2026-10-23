"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * The URL that wasn't found. The 404 page is prerendered once (as
 * /_not-found), so the real path is only known in the browser: read it after
 * hydration instead of rendering a server value that would mismatch.
 */
export function NotFoundPath() {
  const path = useSyncExternalStore(noop, () => window.location.pathname, () => null);
  return <>{path ?? "…"}</>;
}
