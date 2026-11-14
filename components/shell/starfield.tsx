"use client";

import { useEffect, useRef } from "react";

/**
 * Deep-space backdrop: a faint Milky Way band of dust stars plus a sparse layer
 * of brighter stars that twinkle and drift very slowly. Deterministic (seeded),
 * capped at ~24 fps, paused in hidden tabs, and static under reduced motion.
 */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Gaussian-ish sample in [-1, 1] (sum of uniforms). */
const bell = (r: () => number) => (r() + r() + r() - 1.5) / 1.5;

type Star = { x: number; y: number; r: number; a: number; tw: number; ph: number; hue: string; near: boolean };

const STAR_TINTS = ["255,255,255", "222,232,255", "200,215,255", "255,236,214"];
/** Drift in px per second for the far (dust) and near (bright) layers. */
const DRIFT = { far: 0.9, near: 1.8 };
const FRAME_MS = 1000 / 24;

export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    let w = 0;
    let h = 0;
    let dpr = 1;
    let stars: Star[] = [];
    let dust: HTMLCanvasElement | null = null;
    let frame = 0;
    let last = 0;
    const start = performance.now();

    function build() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      const rand = mulberry32(20260127);
      const area = (w * h) / 10000;

      // Milky Way: dim dust stars clustered around a shallow diagonal band, pre-rendered once.
      dust = document.createElement("canvas");
      dust.width = canvas!.width;
      dust.height = canvas!.height;
      const d = dust.getContext("2d");
      if (d) {
        d.scale(dpr, dpr);
        const n = Math.round(area * 9);
        for (let i = 0; i < n; i++) {
          const x = rand() * w;
          const inBand = rand() < 0.65;
          const bandY = h * 0.18 + (x / w) * h * 0.5;
          const y = inBand ? bandY + bell(rand) * h * 0.16 : rand() * h;
          const r = rand() * 0.55 + 0.2;
          const alpha = (inBand ? 0.32 : 0.2) * (0.4 + rand() * 0.6);
          d.fillStyle = `rgba(${STAR_TINTS[Math.floor(rand() * 3)]},${alpha.toFixed(3)})`;
          d.fillRect(x, y, r * 2, r * 2);
        }
      }

      // Bright stars: sparse, a few with a soft glow.
      const count = Math.round(area * 1.4);
      stars = Array.from({ length: count }, () => {
        const big = rand() < 0.08;
        return {
          x: rand() * w,
          y: rand() * h,
          r: big ? 1.1 + rand() * 0.7 : 0.45 + rand() * 0.6,
          a: big ? 0.75 + rand() * 0.25 : 0.35 + rand() * 0.45,
          tw: 0.35 + rand() * 0.9,
          ph: rand() * Math.PI * 2,
          hue: STAR_TINTS[Math.floor(rand() * STAR_TINTS.length)] as string,
          near: big || rand() < 0.4,
        };
      });
    }

    function draw(now: number) {
      const t = reduced.matches ? 0 : (now - start) / 1000;
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      if (dust) {
        const off = ((t * DRIFT.far * dpr) % canvas!.width + canvas!.width) % canvas!.width;
        ctx!.drawImage(dust, -off, 0);
        ctx!.drawImage(dust, canvas!.width - off, 0);
      }
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const s of stars) {
        const x = (((s.x - t * (s.near ? DRIFT.near : DRIFT.far)) % w) + w) % w;
        const alpha = s.a * (0.7 + 0.3 * Math.sin(t * s.tw + s.ph));
        if (s.r > 1) {
          const g = ctx!.createRadialGradient(x, s.y, 0, x, s.y, s.r * 5);
          g.addColorStop(0, `rgba(${s.hue},${(alpha * 0.35).toFixed(3)})`);
          g.addColorStop(1, `rgba(${s.hue},0)`);
          ctx!.fillStyle = g;
          ctx!.beginPath();
          ctx!.arc(x, s.y, s.r * 5, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.fillStyle = `rgba(${s.hue},${alpha.toFixed(3)})`;
        ctx!.beginPath();
        ctx!.arc(x, s.y, s.r, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function loop(now: number) {
      if (now - last >= FRAME_MS) {
        last = now;
        draw(now);
      }
      frame = requestAnimationFrame(loop);
    }

    function restart() {
      cancelAnimationFrame(frame);
      build();
      if (reduced.matches) draw(start);
      else frame = requestAnimationFrame(loop);
    }

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(restart, 150);
    };

    restart();
    window.addEventListener("resize", onResize);
    reduced.addEventListener("change", restart);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      reduced.removeEventListener("change", restart);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-90" />;
}
