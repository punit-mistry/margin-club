"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Observe an element's content box. `measured` stays false until the browser has
 * reported a real size — charts should not draw before that, or they render
 * once at the fallback size and then visibly jump.
 */
export function useSize<T extends HTMLElement>(fallback = { width: 640, height: 320 }) {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ ...fallback, measured: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((s) => (s.measured && Math.abs(s.width - width) < 1 && Math.abs(s.height - height) < 1 ? s : { width, height, measured: true }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}
