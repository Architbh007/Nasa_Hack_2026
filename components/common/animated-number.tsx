"use client";

import { useEffect, useRef, useState } from "react";

/** ease-out-expo: fast start, long gentle settle. */
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * A number that glides to its new value when it changes, so a slider drag reads as one continuous
 * change instead of a flicker of digits. First render shows the real value; reduced motion jumps straight to it.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  durationMs = 450,
  format,
  className,
}: {
  value: number;
  decimals?: number;
  durationMs?: number;
  format?: (v: number) => string;
  className?: string;
}) {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);

  useEffect(() => {
    const from = shownRef.current;
    if (from === value) return;
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : durationMs;
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const v = from + (value - from) * easeOutExpo(t);
      shownRef.current = v;
      setShown(v);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  const text = format ? format(shown) : shown.toFixed(decimals);
  return <span className={`tabular ${className ?? ""}`}>{text}</span>;
}
