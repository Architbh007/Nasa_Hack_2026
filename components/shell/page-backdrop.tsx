/**
 * Full-page backdrop: a pale blue wash with a few airflow lines drifting across it.
 * It sits behind everything, never takes clicks, and holds still for people who ask for reduced motion.
 */
const LINES = [
  { d: "M-80 130 C 260 60, 520 210, 800 140 S 1280 70, 1540 160", delay: "0s", duration: "34s" },
  { d: "M-80 290 C 240 360, 540 220, 820 300 S 1260 380, 1540 280", delay: "-9s", duration: "42s" },
  { d: "M-80 470 C 300 400, 560 540, 860 470 S 1240 400, 1540 490", delay: "-20s", duration: "38s" },
  { d: "M-80 640 C 220 710, 600 580, 880 650 S 1300 720, 1540 630", delay: "-5s", duration: "46s" },
  { d: "M-80 810 C 280 750, 520 880, 840 810 S 1260 740, 1540 830", delay: "-27s", duration: "40s" },
] as const;

export function PageBackdrop() {
  return (
    <div aria-hidden className="page-backdrop pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" fill="none">
        {LINES.map((line) => (
          <g key={line.d}>
            <path d={line.d} stroke="#2276ac" strokeOpacity="0.09" strokeWidth="1.25" />
            <path
              d={line.d}
              className="page-backdrop-flow"
              stroke="#2276ac"
              strokeOpacity="0.3"
              strokeWidth="1.5"
              strokeLinecap="round"
              pathLength={1000}
              strokeDasharray="70 930"
              style={{ animationDelay: line.delay, animationDuration: line.duration }}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
