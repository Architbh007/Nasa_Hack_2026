"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Flame, Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiError, SiMeta, SiSkeleton } from "@/components/si/si-states";
import { SiMarkdown } from "@/components/si/si-markdown";
import type { FireTwinNarration } from "@/lib/ai/schemas";
import { GRAVITY_LABEL, MATERIAL_LABEL } from "@/lib/constants";
import {
  CREW,
  DETECTOR,
  formatClock,
  ILLUSTRATIVE,
  planFire,
  sampleScaleNote,
  ROOM,
  ROOM_ITEMS,
  stateAt,
  type FireEvent,
  type FireEventKind,
  type FirePlan,
  type RoomItem,
} from "@/lib/fire-twin";
import { eventCaption, eventTitle } from "@/lib/fire-twin-narration";
import { evidenceRuns } from "@/lib/flammability-grid";
import type { HabitatInputs } from "@/lib/habitat";
import { runsWithinTolerance } from "@/lib/metrics";
import type { HabitatGravity, MaterialClass, Run, Scenario } from "@/lib/schema";
import { useSiMutation } from "@/lib/si-client";
import { cn } from "@/lib/utils";

const MATERIAL_FILL: Record<MaterialClass, string> = {
  fabric: "#3d5a8c",
  plastic: "#5a5e66",
  foam: "#7d6a45",
  "wire-insulation": "#6c5a86",
  "liquid-fuel": "#5a5e66",
  "gas-leak": "#5a5e66",
};

const EVENT_COLOR: Record<FireEventKind, string> = {
  ignition: "#ff7a3d",
  spread: "#ff7a3d",
  "no-ignition": "#3987e5",
  "untested-start": "#fab219",
  "untested-contact": "#fab219",
  "smoke-detected": "#5cc8ff",
  alarm: "#e66767",
  "vent-shutdown": "#199e70",
  extinguisher: "#199e70",
  "self-extinguish": "#199e70",
  out: "#199e70",
  "burnt-out": "#9a9fa9",
};

type Speed = "auto" | 2 | 10 | 30;
const SPEEDS: readonly Speed[] = ["auto", 2, 10, 30];

const center = (i: RoomItem) => ({ x: i.x + i.w / 2, y: i.y + i.h / 2 });

/** How far smoke released at `te` has drifted by `t`, accounting for the vents stopping. */
function smokeDrift(plan: FirePlan, te: number, t: number): number {
  const ventOff = plan.events.find((e) => e.kind === "vent-shutdown")?.t ?? Infinity;
  const flow = plan.ventsOn ? plan.flowCmS : ILLUSTRATIVE.stillAirSmokeCmS;
  const fastUntil = Math.min(t, ventOff);
  const fast = Math.max(0, fastUntil - te) * flow;
  const slow = Math.max(0, t - Math.max(te, ventOff)) * ILLUSTRATIVE.stillAirSmokeCmS;
  return fast + (plan.ventsOn ? slow : 0);
}

function FlameShapeInset({ gravity }: { gravity: HabitatGravity }) {
  const micro = gravity === "micro";
  const stretch = gravity === "earth" ? 1 : gravity === "mars" ? 0.6 : gravity === "lunar" ? 0.4 : 0;
  return (
    <figure className="flex items-center gap-3">
      <svg viewBox="0 0 60 60" className="size-14 shrink-0" aria-hidden>
        <defs>
          <radialGradient id="ft-inset-micro" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e8f4ff" />
            <stop offset="45%" stopColor="#6fb6ff" stopOpacity="0.9" />
            <stop offset="80%" stopColor="#ff8a3d" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ff8a3d" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ft-inset-grav" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#6fb6ff" />
            <stop offset="25%" stopColor="#fff2c2" />
            <stop offset="70%" stopColor="#ffb347" />
            <stop offset="100%" stopColor="#ff6a1f" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <line x1="30" y1="52" x2="30" y2="40" stroke="#9a9fa9" strokeWidth="1.5" />
        {micro ? (
          <circle cx="30" cy="34" r="15" fill="url(#ft-inset-micro)" className="ft-flicker" />
        ) : (
          <path
            d={`M30 ${44} C 18 ${44}, 18 ${30 - stretch * 6}, 30 ${18 - stretch * 12} C 42 ${30 - stretch * 6}, 42 ${44}, 30 ${44} Z`}
            fill="url(#ft-inset-grav)"
            className="ft-flicker"
          />
        )}
      </svg>
      <figcaption className="text-[11px] leading-snug text-muted-foreground">
        <span className="font-medium text-foreground/90">Flame shape, side view ({GRAVITY_LABEL[gravity].toLowerCase()})</span>
        <br />
        {micro
          ? "No 'up': hot gas doesn't rise, so the flame is a dim, round ball fed only by airflow and slow diffusion."
          : "Hot gas rises and pulls in fresh air, so the flame stretches upward. Weaker gravity gives a shorter, rounder flame."}
      </figcaption>
    </figure>
  );
}

function Toggle({ label, value, onChange, on, off }: { label: string; value: boolean; onChange: (v: boolean) => void; on: string; off: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-lg border border-border bg-background/40 p-0.5">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={cn(
              "rounded-md px-2 py-1 text-xs transition-colors",
              value === v ? "bg-secondary text-foreground ring-1 ring-primary/40" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {v ? on : off}
          </button>
        ))}
      </div>
    </div>
  );
}

function Room({ plan, t, onPickItem, canPick }: { plan: FirePlan; t: number; onPickItem: (id: string) => void; canPick: boolean }) {
  const s = stateAt(plan, t);
  const micro = plan.inputs.gravity === "micro";
  const ventOffAt = plan.events.find((e) => e.kind === "vent-shutdown")?.t ?? Infinity;

  return (
    <svg viewBox="-16 -16 332 212" className="h-auto w-full rounded-xl bg-[#0e0f12]" role="img" aria-label="Top-down view of the habitat module with the fire simulation">
      <defs>
        <radialGradient id="ft-flame-micro" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f1f8ff" />
          <stop offset="35%" stopColor="#7cc4ff" stopOpacity="0.95" />
          <stop offset="70%" stopColor="#ff8a3d" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ff8a3d" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ft-flame-grav" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff7d6" />
          <stop offset="35%" stopColor="#ffc24d" stopOpacity="0.95" />
          <stop offset="70%" stopColor="#ff5f1f" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#ff5f1f" stopOpacity="0" />
        </radialGradient>
        <filter id="ft-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <clipPath id="ft-room">
          <rect x="0" y="0" width={ROOM.w} height={ROOM.h} rx="18" />
        </clipPath>
      </defs>

      {/* Module shell */}
      <rect x="-6" y="-6" width={ROOM.w + 12} height={ROOM.h + 12} rx="22" fill="#1a1b20" stroke="#33363d" strokeWidth="2" />
      <rect x="0" y="0" width={ROOM.w} height={ROOM.h} rx="18" fill="#131418" />
      {Array.from({ length: 9 }, (_, i) => (
        <line key={i} x1={(i + 1) * 30} y1="0" x2={(i + 1) * 30} y2={ROOM.h} stroke="#1f2126" strokeWidth="0.6" />
      ))}

      {/* Vents and airflow */}
      <rect x="-8" y="70" width="8" height="40" rx="2" fill={s.ventsOn ? "#5cc8ff" : "#40434a"} />
      <rect x={ROOM.w} y="70" width="8" height="40" rx="2" fill={s.ventsOn ? "#5cc8ff" : "#40434a"} />
      <text x="4" y="122" fontSize="7" fill="#9a9fa9">Supply vent</text>
      <text x={ROOM.w - 4} y="122" fontSize="7" fill="#9a9fa9" textAnchor="end">Return vent</text>
      {s.ventsOn &&
        [50, 90, 130].map((y) => (
          <line key={y} x1="12" y1={y} x2={ROOM.w - 12} y2={y} stroke="#5cc8ff" strokeOpacity="0.25" strokeWidth="1.2" strokeDasharray="4 10" className="ft-flow" />
        ))}

      {/* Items */}
      {ROOM_ITEMS.map((item) => {
        const st = s.items[item.id];
        const risk = plan.risks[item.id];
        const isStart = item.id === plan.startItemId;
        const burnt = st?.kind === "out" ? st.burnt : st?.kind === "burning" ? st.progress * 0.8 : 0;
        return (
          <g
            key={item.id}
            onClick={canPick ? () => onPickItem(item.id) : undefined}
            className={canPick ? "cursor-pointer" : undefined}
          >
            <rect x={item.x} y={item.y} width={item.w} height={item.h} rx="5" fill={MATERIAL_FILL[item.material]} stroke={isStart ? "#ff7a3d" : "#33363d"} strokeWidth={isStart ? 1.6 : 1} strokeDasharray={isStart && t === 0 ? "3 2" : undefined} />
            {burnt > 0 && <rect x={item.x} y={item.y} width={item.w * burnt} height={item.h} rx="5" fill="#120c08" fillOpacity="0.85" />}
            <text x={item.x + item.w / 2} y={item.y + item.h + 9} fontSize="7.5" fill="#cfd2d8" textAnchor="middle">
              {item.label}
            </text>
            <g transform={`translate(${item.x + item.w - 2} ${item.y - 2})`}>
              <rect x="-23" y="-6" width="25" height="11" rx="5.5" fill={risk?.tested ? "#131418" : "#3b2d0a"} stroke={risk?.tested ? "#33363d" : "#fab219"} strokeWidth="0.8" />
              <text x="-10.5" y="2.4" fontSize="6.5" textAnchor="middle" fill={risk?.tested ? "#e8e9ec" : "#fab219"}>
                {risk?.evidence ? `${risk.evidence.burned}/${risk.evidence.considered}` : "?"}
              </text>
            </g>
            {st?.kind === "untested-contact" && (
              <g transform={`translate(${center(item).x} ${center(item).y})`}>
                <circle r="9" fill="#fab219" fillOpacity="0.2" stroke="#fab219" className="ft-pulse" />
                <text y="3.5" fontSize="10" fontWeight="700" textAnchor="middle" fill="#fab219">?</text>
              </g>
            )}
          </g>
        );
      })}

      {/* Smoke */}
      <g clipPath="url(#ft-room)" filter="url(#ft-blur)" pointerEvents="none">
        {plan.timelines.flatMap((tl) => {
          const item = ROOM_ITEMS.find((i) => i.id === tl.itemId) as RoomItem;
          const c = center(item);
          const puffs = [];
          for (let k = 0; k < 40; k++) {
            const te = tl.ignitedAt + k * 3;
            if (te > t || te > tl.outAt) break;
            const age = t - te;
            if (age > 45) continue;
            const dx = smokeDrift(plan, te, t);
            const spreadY = Math.sin(k * 1.7) * Math.min(age, 30) * (te < ventOffAt && plan.ventsOn ? 0.5 : 1.1);
            puffs.push(
              <circle
                key={`${tl.itemId}-${k}`}
                cx={Math.min(ROOM.w - 4, c.x + dx)}
                cy={c.y + spreadY}
                r={Math.min(30, 5 + age * 1.3)}
                fill="#a3a7af"
                fillOpacity={Math.max(0, 0.3 * (1 - age / 45))}
              />
            );
          }
          return puffs;
        })}
      </g>

      {/* Flames */}
      {ROOM_ITEMS.map((item) => {
        const st = s.items[item.id];
        if (st?.kind !== "burning") return null;
        const c = center(item);
        const r = 3 + st.intensity * (7 + 13 * st.progress);
        const cx = c.x + (s.ventsOn ? item.w * 0.22 * st.progress : 0);
        return (
          <g key={`flame-${item.id}`} pointerEvents="none">
            <circle cx={cx} cy={c.y} r={r * 1.6} fill={micro ? "#7cc4ff" : "#ff8a3d"} fillOpacity={0.08 * st.intensity} />
            <circle cx={cx} cy={c.y} r={r} fill={`url(#${micro ? "ft-flame-micro" : "ft-flame-grav"})`} opacity={micro ? 0.85 : 1} className="ft-flicker" />
          </g>
        );
      })}

      {/* Detector and crew */}
      <g transform={`translate(${DETECTOR.x} ${DETECTOR.y})`}>
        {s.alarm && <circle r="10" fill="none" stroke="#e66767" className="ft-pulse" />}
        <circle r="4.5" fill={s.alarm ? "#e66767" : "#26282e"} stroke="#cfd2d8" strokeWidth="0.8" />
        <text y="-8" fontSize="6.5" textAnchor="middle" fill="#9a9fa9">Smoke detector</text>
      </g>
      <g transform={`translate(${CREW.x} ${CREW.y})`}>
        <circle r="6" fill="#e8e9ec" fillOpacity="0.9" />
        <circle r="10" fill="none" stroke="#e8e9ec" strokeOpacity="0.4" />
        <text y="20" fontSize="7" textAnchor="middle" fill="#cfd2d8">Crew</text>
      </g>
    </svg>
  );
}

function Timeline({ plan, t, onSeek }: { plan: FirePlan; t: number; onSeek: (t: number) => void }) {
  const end = Math.max(plan.endT, 1);
  const visible = plan.events.filter((e) => e.kind !== "burnt-out");
  return (
    <div className="space-y-1">
      <div
        className="relative h-9 cursor-pointer rounded-lg border border-border bg-background/40"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          onSeek(((e.clientX - r.left) / r.width) * end);
        }}
        role="slider"
        aria-label="Simulation time"
        aria-valuemin={0}
        aria-valuemax={Math.round(end)}
        aria-valuenow={Math.round(t)}
        aria-valuetext={formatClock(t)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") onSeek(Math.min(end, t + end / 20));
          if (e.key === "ArrowLeft") onSeek(Math.max(0, t - end / 20));
        }}
      >
        <div className="absolute inset-y-0 left-0 rounded-l-lg bg-primary/10" style={{ width: `${Math.min(100, (t / end) * 100)}%` }} />
        {visible.map((e, i) => (
          <span
            key={`${e.kind}-${e.itemId ?? ""}-${i}`}
            title={`${formatClock(e.t)} ${eventTitle(e)}${e.illustrative ? " (illustrative)" : ""}`}
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
            style={{
              left: `${Math.min(100, (e.t / end) * 100)}%`,
              borderColor: EVENT_COLOR[e.kind],
              background: e.illustrative ? "transparent" : EVENT_COLOR[e.kind],
            }}
          />
        ))}
        <span className="absolute inset-y-0 w-0.5 bg-foreground" style={{ left: `${Math.min(100, (t / end) * 100)}%` }} aria-hidden />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground tabular">
        <span>0:00</span>
        <span>Filled dot = from data · hollow dot = illustrative timing</span>
        <span>{formatClock(end)}</span>
      </div>
    </div>
  );
}

function confidenceFor(plan: FirePlan, data: { runs: readonly Run[] }): { level: "tested" | "near" | "untested"; text: string } {
  const start = plan.risks[plan.startItemId];
  if (!start?.tested || !start.evidence) {
    return {
      level: "untested",
      text: `No real ${MATERIAL_LABEL[start?.item.material ?? "foam"].toLowerCase()} run near this air states an outcome, so nothing here is backed by a run.`,
    };
  }
  const m = start.item.material;
  const exact = runsWithinTolerance(plan.inputs, evidenceRuns(m, data.runs), null).length;
  const ev = start.evidence;
  return exact > 0
    ? { level: "tested", text: `${exact} real ${MATERIAL_LABEL[m].toLowerCase()} runs lie within ±2% oxygen and ±1 psi of this air; ${ev.burned} of the ${ev.considered} nearest that state an outcome burned. ${sampleScaleNote(ev)}` }
    : { level: "near", text: `No ${MATERIAL_LABEL[m].toLowerCase()} run at this exact air, but ${ev.considered} nearby runs state an outcome (${ev.burned} burned). Read the fire as nearby evidence, not a measured result here. ${sampleScaleNote(ev)}` };
}

function testNext(plan: FirePlan): string[] {
  const out: string[] = [];
  const air = `${plan.inputs.o2Percent.toFixed(1)}% oxygen at ${plan.inputs.pressurePsi.toFixed(1)} psi`;
  const untested = Object.values(plan.risks).filter((r) => !r.tested).map((r) => MATERIAL_LABEL[r.item.material].toLowerCase());
  if (untested.length) out.push(`Burn and flame-spread tests of ${[...new Set(untested)].join(" and ")} at ${air}: no real run near this air states an outcome for them.`);
  const start = plan.risks[plan.startItemId];
  if (start?.tested) out.push(`Larger ${MATERIAL_LABEL[start.item.material].toLowerCase()} fires at ${air}, Saffire-style, to check how fast a real-size fire spreads to the next item.`);
  if (plan.inputs.gravity === "lunar" || plan.inputs.gravity === "mars") {
    out.push(`Any burning test at ${GRAVITY_LABEL[plan.inputs.gravity].toLowerCase()} gravity: no partial-gravity combustion data exists yet.`);
  }
  return out;
}

export function FireTwin({
  inputs,
  scenarios,
  presetId,
  onPreset,
  runs,
}: {
  inputs: HabitatInputs;
  scenarios: readonly Scenario[];
  presetId: string;
  onPreset: (id: string) => void;
  runs: readonly Run[];
}) {
  const data = useMemo(() => ({ runs }), [runs]);
  const [startItemId, setStartItemId] = useState(ROOM_ITEMS[0]?.id ?? "stowage-bag");
  const [ventsOn, setVentsOn] = useState(inputs.airflow !== "quiescent");
  const [crewResponse, setCrewResponse] = useState(true);
  const [speed, setSpeed] = useState<Speed>("auto");
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);

  // A new airflow setting resets the vent toggle to match it.
  const [airflowSeen, setAirflowSeen] = useState(inputs.airflow);
  if (airflowSeen !== inputs.airflow) {
    setAirflowSeen(inputs.airflow);
    setVentsOn(inputs.airflow !== "quiescent");
  }

  const plan = useMemo(() => planFire(inputs, startItemId, { ventsOn, crewResponse }, data), [inputs, startItemId, ventsOn, crewResponse, data]);
  const planKey = JSON.stringify([inputs, startItemId, ventsOn, crewResponse]);
  const [planSeen, setPlanSeen] = useState(planKey);
  if (planSeen !== planKey) {
    setPlanSeen(planKey);
    setT(0);
    setPlaying(false);
  }

  const rate = speed === "auto" ? Math.min(40, Math.max(2, plan.endT / 20)) : speed;
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const next = Math.min(plan.endT, tRef.current + dt * rate);
      tRef.current = next;
      setT(next);
      if (next >= plan.endT) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, plan.endT, rate]);

  const finished = t >= plan.endT;
  const passed = plan.events.filter((e) => e.t <= t);
  const started = playing || t > 0;
  const current: FireEvent | undefined = started ? passed.filter((e) => e.kind !== "burnt-out").at(-1) : undefined;
  const confidence = useMemo(() => confidenceFor(plan, data), [plan, data]);
  const pickItem = (id: string) => {
    setStartItemId(id);
    setT(0);
    setPlaying(false);
  };
  const onPlay = () => {
    if (finished) {
      tRef.current = 0;
      setT(0);
      setPlaying(true);
    } else {
      setPlaying((p) => !p);
    }
  };
  const restart = () => {
    tRef.current = 0;
    setT(0);
    setPlaying(false);
  };
  const seek = (v: number) => {
    setPlaying(false);
    const next = Math.max(0, Math.min(plan.endT, v));
    tRef.current = next;
    setT(next);
  };

  // SI narration for exactly this run; changing anything makes it stale.
  const { state: siRaw, run } = useSiMutation<FireTwinNarration>("/api/fire-twin");
  const [siFor, setSiFor] = useState<string | null>(null);
  const si = siFor === planKey ? siRaw : ({ status: "idle" } as const);
  const runSi = () => {
    setSiFor(planKey);
    void run({ inputs, startItemId, ventsOn, crewResponse });
  };

  const presetChips = scenarios.filter((s) => s.id !== "spacesuit");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-1.5">
          <Button size="sm" onClick={onPlay} aria-label={playing ? "Pause" : "Play"}>
            {playing ? <Pause /> : <Play />} {playing ? "Pause" : finished ? "Replay" : t > 0 ? "Resume" : "Start fire"}
          </Button>
          <Button size="sm" variant="outline" onClick={restart} aria-label="Restart">
            <RotateCcw />
          </Button>
          <label className="sr-only" htmlFor="ft-speed">Speed</label>
          <select
            id="ft-speed"
            value={String(speed)}
            onChange={(e) => setSpeed(e.target.value === "auto" ? "auto" : (Number(e.target.value) as Speed))}
            className="h-8 rounded-md border border-border bg-background/40 px-2 text-xs"
          >
            {SPEEDS.map((s) => (
              <option key={String(s)} value={String(s)}>
                {s === "auto" ? `Auto (${Math.round(rate)}×)` : `${s}×`}
              </option>
            ))}
          </select>
        </div>
        <Toggle label="Vents" value={ventsOn} onChange={setVentsOn} on="On" off="Off" />
        <Toggle label="Crew response" value={crewResponse} onChange={setCrewResponse} on="On" off="Off" />
        <div className="flex items-center gap-2">
          <label htmlFor="ft-start" className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Fire starts at</label>
          <select id="ft-start" value={startItemId} onChange={(e) => pickItem(e.target.value)} className="h-8 rounded-md border border-border bg-background/40 px-2 text-xs">
            {ROOM_ITEMS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label} ({MATERIAL_LABEL[i.material].toLowerCase()})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Same fire, other habitat</span>
        {presetChips.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onPreset(s.id)}
            aria-pressed={presetId === s.id}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-colors",
              presetId === s.id ? "border-primary/60 bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {s.label} · {s.o2Percent}%
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-3">
          <div className="relative">
            <Room plan={plan} t={t} onPickItem={pickItem} canPick={!playing} />
            <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-background/80 px-2 py-1 text-xs tabular backdrop-blur">
              <Flame className="mr-1 inline size-3 text-primary" aria-hidden />
              {formatClock(t)} <span className="text-muted-foreground">sim time</span>
            </div>
          </div>
          <Timeline plan={plan} t={t} onSeek={seek} />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <FlameShapeInset gravity={plan.inputs.gravity} />
            <p className="max-w-xs text-[11px] leading-snug text-muted-foreground">
              Badges show how many of the nearest real runs of that material burned (for example 2/5); &quot;?&quot; means no nearby run states an outcome. Click an item to start the fire there.
            </p>
          </div>
        </div>

        <div className="min-w-0 space-y-3">
          <div className="rounded-lg border border-border bg-background/40 p-3.5" aria-live="polite">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">Narrator</p>
            {current ? (
              <>
                <p className="text-sm font-medium">
                  <span className="tabular text-muted-foreground">{formatClock(current.t)}</span> {eventTitle(current)}
                  {current.illustrative && <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">illustrative timing</span>}
                </p>
                <SiMarkdown text={eventCaption(plan, current)} className="mt-1" />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Press <span className="text-foreground">Start fire</span> to light the {ROOM_ITEMS.find((i) => i.id === startItemId)?.label.toLowerCase()} in a cabin
                at {inputs.o2Percent.toFixed(1)}% oxygen and {inputs.pressurePsi.toFixed(1)} psi.
              </p>
            )}
          </div>

          <ol className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {plan.events
              .filter((e) => e.kind !== "burnt-out")
              .map((e, i) => (
                <li key={`${e.kind}-${e.itemId ?? ""}-${i}`} className={cn("flex gap-2 text-xs transition-opacity", e.t > t && "opacity-40")}>
                  <span className="mt-1 size-2 shrink-0 rounded-full border" style={{ borderColor: EVENT_COLOR[e.kind], background: e.illustrative ? "transparent" : EVENT_COLOR[e.kind] }} />
                  <span className="tabular w-9 shrink-0 text-muted-foreground">{formatClock(e.t)}</span>
                  <span>{eventTitle(e)}</span>
                </li>
              ))}
          </ol>

          {finished && (
            <div className="space-y-2.5 rounded-lg border border-border bg-card p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">How sure are we?</p>
              <p className="text-sm">
                <span
                  className={cn(
                    "mr-2 rounded px-1.5 py-0.5 text-xs font-medium",
                    confidence.level === "tested" && "bg-[#199e70]/20 text-[#5fd3a6]",
                    confidence.level === "near" && "bg-warning/15 text-warning",
                    confidence.level === "untested" && "bg-destructive/15 text-destructive"
                  )}
                >
                  {confidence.level === "tested" ? "Has test data" : confidence.level === "near" ? "Nearby runs only" : "No test data"}
                </span>
                {confidence.text}
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">What NASA should test next</p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {testNext(plan).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2 rounded-lg border border-border bg-background/40 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">SI narration</p>
              <Button size="sm" variant="outline" onClick={runSi} disabled={si.status === "loading"}>
                <Sparkles /> {si.status === "success" ? "Regenerate" : "Explain this fire"}
              </Button>
            </div>
            {si.status === "idle" && <p className="text-xs text-muted-foreground">The SI retells this run in plain words, names the lesson and the next test, and cites its sources.</p>}
            {si.status === "loading" && <SiSkeleton lines={4} />}
            {si.status === "error" && <SiError message={si.message} onRetry={runSi} />}
            {si.status === "success" && (
              <div className="space-y-2">
                <SiMarkdown text={si.data.narration} />
                <SiMarkdown text={`**Lesson:** ${si.data.takeaway}`} />
                <SiMarkdown text={`**Test next:** ${si.data.testNext}`} />
                <SiMeta cached={si.cached} model={si.model} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
