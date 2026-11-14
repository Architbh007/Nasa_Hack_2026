import type { CSSProperties } from "react";

const dur = (s: number) => ({ "--fs-dur": `${s}s` }) as CSSProperties;

/**
 * Hero instrument: a flame in freefall, drawn the way it burns without buoyancy (a blue sphere
 * with a small warm core), inside slowly turning orbit rings. Decorative only.
 */
export function HeroOrbit({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 480" className={className} fill="none" aria-hidden>
      <defs>
        <radialGradient id="ho-halo">
          <stop offset="0" stopColor="#3987e5" stopOpacity="0.5" />
          <stop offset="0.55" stopColor="#3987e5" stopOpacity="0.12" />
          <stop offset="1" stopColor="#3987e5" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ho-shell">
          <stop offset="0" stopColor="#bfe6ff" stopOpacity="0.15" />
          <stop offset="0.62" stopColor="#4aa3ff" stopOpacity="0.55" />
          <stop offset="0.86" stopColor="#6cc9ff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#3987e5" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ho-core">
          <stop offset="0" stopColor="#fff4d6" />
          <stop offset="0.45" stopColor="#ffb057" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ff7a3d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ho-orbit" x1="0" x2="1">
          <stop offset="0" stopColor="#6cc9ff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#6cc9ff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#6cc9ff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Crosshair and range rings */}
      <path d="M240 8v70M240 402v70M8 240h70M402 240h70" stroke="rgb(148 170 204 / 0.25)" />
      <circle cx="240" cy="240" r="226" stroke="rgb(148 170 204 / 0.5)" strokeWidth="6" strokeDasharray="1 11" className="fs-spin" style={dur(160)} />
      <circle cx="240" cy="240" r="200" stroke="rgb(148 170 204 / 0.16)" />
      <circle cx="240" cy="240" r="150" stroke="rgb(108 201 255 / 0.35)" strokeDasharray="3 9" className="fs-spin-rev" style={dur(110)} />
      <circle cx="240" cy="240" r="100" stroke="rgb(148 170 204 / 0.14)" />
      <g className="fs-spin" style={dur(40)}>
        <path d="M240 40a200 200 0 0 1 173 100" stroke="#ff7a3d" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        <circle cx="413" cy="140" r="3" fill="#ff7a3d" />
      </g>

      {/* Tilted orbit with a satellite */}
      <g transform="rotate(-18 240 240)">
        <ellipse cx="240" cy="240" rx="214" ry="72" stroke="url(#ho-orbit)" />
        <g transform="translate(240 240) scale(1 0.336) translate(-240 -240)">
          <g className="fs-spin" style={dur(26)}>
            <ellipse cx="454" cy="240" rx="3.5" ry="10.4" fill="#ffffff" />
            <ellipse cx="454" cy="240" rx="9" ry="27" fill="#6cc9ff" opacity="0.25" />
          </g>
        </g>
      </g>

      {/* The flame */}
      <circle cx="240" cy="240" r="120" fill="url(#ho-halo)" />
      <g className="fs-breathe">
        <circle cx="240" cy="240" r="54" fill="url(#ho-shell)" />
        <circle cx="240" cy="240" r="20" fill="url(#ho-core)" />
      </g>

      {/* Callout */}
      <path d="M282 208l36-38h132" stroke="rgb(108 201 255 / 0.6)" />
      <circle cx="282" cy="208" r="2.5" fill="#6cc9ff" />
      <text x="322" y="160" fill="#e8edf5" fontSize="11" letterSpacing="1.6" style={{ fontFamily: "var(--font-dm-mono), monospace" }}>
        FLAME IN FREEFALL
      </text>
      <text x="322" y="188" fill="#95a2b6" fontSize="10" letterSpacing="0.4" style={{ fontFamily: "var(--font-dm-mono), monospace" }}>
        no buoyancy, spherical
      </text>
    </svg>
  );
}
