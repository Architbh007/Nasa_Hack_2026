import { AIRFLOW_CM_S, MATERIAL_LABEL } from "@/lib/constants";
import { evidenceRuns } from "@/lib/flammability-grid";
import type { HabitatInputs } from "@/lib/habitat";
import { nearestRuns, NEAR_DISTANCE } from "@/lib/metrics";
import type { MaterialClass, Run } from "@/lib/schema";

/**
 * Fire Twin: a simple, deterministic cabin fire timeline for one habitat module.
 *
 * Data-backed: whether each item ignites comes from what the nearest real runs of that
 * material recorded at this atmosphere (burned, or flame went out / never lit). Items with no
 * nearby real run that states an outcome are "untested": the app does not guess for them.
 * Illustrative (not in the data): flame-spread speed (no spread rate is recorded in these
 * tables), smoke travel and detection delays, crew response times, the vent direction boost and
 * the self-extinguish delay after the vents stop. Every event carries an `illustrative` flag so
 * the UI can say so.
 */

/** Top-down module footprint, in cm. */
export const ROOM = { w: 300, h: 180 } as const;

export type RoomItem = { id: string; label: string; material: MaterialClass; x: number; y: number; w: number; h: number };

export const ROOM_ITEMS: readonly RoomItem[] = [
  { id: "stowage-bag", label: "Stowage bag", material: "fabric", x: 34, y: 34, w: 52, h: 40 },
  { id: "sleeping-bag", label: "Sleeping bag", material: "fabric", x: 96, y: 26, w: 40, h: 64 },
  { id: "plastic-panel", label: "Plastic panel", material: "plastic", x: 146, y: 36, w: 48, h: 32 },
  { id: "wire-bundle", label: "Wire bundle", material: "wire-insulation", x: 204, y: 46, w: 54, h: 14 },
  { id: "foam-seat", label: "Foam seat", material: "foam", x: 118, y: 104, w: 58, h: 40 },
];

/** Supply vent on the left wall, return vent (with the smoke detector) on the right wall. */
export const VENT_SUPPLY = { x: 0, y: 90 } as const;
export const VENT_RETURN = { x: ROOM.w, y: 90 } as const;
export const DETECTOR = { x: 284, y: 72 } as const;
export const CREW = { x: 58, y: 136 } as const;

/** Illustrative timings (seconds). */
export const ILLUSTRATIVE = {
  /** Nominal flame-spread speed for every burning item, mm/s. Not measured: the PSI tables hold no spread rate. */
  spreadMmS: 0.5,
  detectorDelayS: 5,
  /** Smoke drift speed when vents are off (diffusion only), cm/s. */
  stillAirSmokeCmS: 1.2,
  alarmAfterDetectS: 4,
  ventShutdownAfterAlarmS: 15,
  extinguisherAfterAlarmS: 45,
  /** Microgravity flames starve without forced flow; time to self-extinguish once flow stops. */
  selfExtinguishAfterFlowStopsS: 25,
  /** Extra spread speed toward items downstream of the vent flow (fraction of the base rate). */
  downstreamBoost: 0.5,
  maxReachGapCm: 30,
  horizonS: 900,
} as const;

/** What the nearest real runs of an item's material recorded at the chosen atmosphere. */
export type ItemEvidence = {
  /** Runs within the "near" distance that state an outcome. */
  considered: number;
  burned: number;
  /** Extinguished, blown off or never lit. */
  wentOut: number;
  /** Investigation ids behind these runs, nearest first. */
  investigationIds: string[];
  runIds: string[];
  /** Sample lengths (cm) of the runs that record one. Runs of very different size can sit side by side. */
  sampleLengthsCm: number[];
};

export type ItemRisk = {
  item: RoomItem;
  /** False when no nearby real run of this material states an outcome (foam, wire insulation, or too far from any run). */
  tested: boolean;
  evidence: ItemEvidence | null;
  /** True when at least one nearby real run burned. Null when untested. */
  ignites: boolean | null;
};

export type FireEventKind =
  | "ignition"
  | "no-ignition"
  | "untested-start"
  | "spread"
  | "untested-contact"
  | "smoke-detected"
  | "alarm"
  | "vent-shutdown"
  | "self-extinguish"
  | "extinguisher"
  | "out"
  | "burnt-out";

export type FireEvent = { t: number; kind: FireEventKind; itemId?: string; illustrative: boolean };

export type ItemTimeline = { itemId: string; ignitedAt: number; outAt: number; burntOutAt: number };

export type FirePlan = {
  startItemId: string;
  inputs: HabitatInputs;
  ventsOn: boolean;
  crewResponse: boolean;
  flowCmS: number;
  risks: Record<string, ItemRisk>;
  timelines: ItemTimeline[];
  contacts: Array<{ itemId: string; t: number }>;
  events: FireEvent[];
  /** When the scene stops changing. */
  endT: number;
  /** Investigations behind the start item's numbers (nearest evidence runs). */
  evidenceIds: string[];
};

const center = (i: RoomItem) => ({ x: i.x + i.w / 2, y: i.y + i.h / 2 });

/** Edge-to-edge gap between two items (0 when touching). */
export function gapCm(a: RoomItem, b: RoomItem): number {
  const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
  const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
  return Math.hypot(dx, dy);
}

/** Distance a flame must travel from the centre of `a` to reach `b`: half of `a` along the direction, plus the gap. */
function reachDistanceCm(a: RoomItem, b: RoomItem): number {
  const ca = center(a);
  const cb = center(b);
  const ux = cb.x - ca.x;
  const uy = cb.y - ca.y;
  const len = Math.hypot(ux, uy) || 1;
  const half = Math.min(Math.abs((a.w / 2) * (len / (Math.abs(ux) || 1e-9))), Math.abs((a.h / 2) * (len / (Math.abs(uy) || 1e-9))));
  return Math.min(half, Math.max(a.w, a.h) / 2) + gapCm(a, b);
}

/** Spread speed boost toward items downstream of the vent flow (illustrative). */
function directionFactor(a: RoomItem, b: RoomItem, ventsOn: boolean): number {
  if (!ventsOn) return 1;
  const ca = center(a);
  const cb = center(b);
  const cos = (cb.x - ca.x) / (Math.hypot(cb.x - ca.x, cb.y - ca.y) || 1);
  return 1 + ILLUSTRATIVE.downstreamBoost * cos;
}

const WENT_OUT = new Set(["extinguished", "blowoff", "no-ignition"]);
/** Plain sentence on how big the burned samples behind an item were, so small strips and large sheets are not read as alike. */
export function sampleScaleNote(ev: Pick<ItemEvidence, "considered" | "sampleLengthsCm">): string {
  const n = ev.sampleLengthsCm.length;
  if (n === 0) return `None of these ${ev.considered} runs records a sample length.`;
  const min = Math.min(...ev.sampleLengthsCm);
  const max = Math.max(...ev.sampleLengthsCm);
  const span = min === max ? `${min} cm` : `${min} to ${max} cm`;
  const rest = ev.considered - n;
  return `Sample length is recorded for ${n} of these ${ev.considered} runs (${span})${rest > 0 ? `; the other ${rest} do not record one, so sample sizes may differ` : ""}.`;
}

/** How many nearest runs of a material are read to decide an item. */
const EVIDENCE_RUNS = 6;

export function itemRisks(inputs: HabitatInputs, data: { runs: readonly Run[] }): Record<string, ItemRisk> {
  const out: Record<string, ItemRisk> = {};
  for (const item of ROOM_ITEMS) {
    // Drop runs with no stated outcome before taking the nearest few, so unknown runs cannot crowd out known ones.
    const stated = evidenceRuns(item.material, data.runs).filter((r) => r.outcome !== "unknown");
    const near = nearestRuns(inputs, stated, { count: EVIDENCE_RUNS }).filter((n) => n.distance <= NEAR_DISTANCE);
    if (near.length === 0) {
      out[item.id] = { item, tested: false, evidence: null, ignites: null };
      continue;
    }
    const burned = near.filter((n) => n.run.outcome === "burned").length;
    const evidence: ItemEvidence = {
      considered: near.length,
      burned,
      wentOut: near.filter((n) => WENT_OUT.has(n.run.outcome)).length,
      investigationIds: [...new Set(near.map((n) => n.run.investigationId))],
      runIds: near.map((n) => n.run.id),
      sampleLengthsCm: near.map((n) => n.run.metrics.lengthCm ?? null).filter((v): v is number => v !== null),
    };
    out[item.id] = { item, tested: true, evidence, ignites: burned > 0 };
  }
  return out;
}

export function planFire(
  inputs: HabitatInputs,
  startItemId: string,
  opts: { ventsOn: boolean; crewResponse: boolean },
  data: { runs: readonly Run[] }
): FirePlan {
  const risks = itemRisks(inputs, data);
  const start = ROOM_ITEMS.find((i) => i.id === startItemId) ?? (ROOM_ITEMS[0] as RoomItem);
  const flowCmS = opts.ventsOn ? AIRFLOW_CM_S[inputs.airflow] ?? 20 : 0;
  const micro = inputs.gravity === "micro";
  const events: FireEvent[] = [];
  const base = { startItemId: start.id, inputs, ventsOn: opts.ventsOn, crewResponse: opts.crewResponse, flowCmS, risks };

  const startRisk = risks[start.id] as ItemRisk;
  const evidenceIds = startRisk.evidence?.investigationIds ?? [];

  if (!startRisk.tested) {
    events.push({ t: 0, kind: "untested-start", itemId: start.id, illustrative: false });
    return { ...base, timelines: [], contacts: [], events, endT: 4, evidenceIds };
  }
  if (!startRisk.ignites) {
    events.push({ t: 0, kind: "no-ignition", itemId: start.id, illustrative: false });
    return { ...base, timelines: [], contacts: [], events, endT: 4, evidenceIds };
  }

  // Suppression schedule (illustrative). Smoke has to reach the detector at the return vent.
  const c = center(start);
  const toDetector = Math.hypot(DETECTOR.x - c.x, DETECTOR.y - c.y);
  const smokeSpeed = flowCmS > 0 ? flowCmS : ILLUSTRATIVE.stillAirSmokeCmS;
  const detectT = toDetector / smokeSpeed + ILLUSTRATIVE.detectorDelayS;
  const alarmT = detectT + ILLUSTRATIVE.alarmAfterDetectS;
  const ventOffT = opts.ventsOn ? alarmT + ILLUSTRATIVE.ventShutdownAfterAlarmS : 0;
  const extinguishT = alarmT + ILLUSTRATIVE.extinguisherAfterAlarmS;

  // When every flame is out, independent of which item it is on.
  let globalOutT = Infinity;
  if (micro) {
    // Without forced flow a microgravity flame starves of oxygen.
    const flowStops = opts.ventsOn ? (opts.crewResponse ? ventOffT : Infinity) : 0;
    globalOutT = flowStops + ILLUSTRATIVE.selfExtinguishAfterFlowStopsS;
  }
  if (opts.crewResponse) globalOutT = Math.min(globalOutT, extinguishT + 5);

  // Earliest-ignition-first propagation over the items (Dijkstra on ignition time).
  const ignitedAt = new Map<string, number>([[start.id, 0]]);
  const done = new Set<string>();
  const contacts = new Map<string, number>();
  const spreadCmS = () => ILLUSTRATIVE.spreadMmS / 10;
  const burnTime = (it: RoomItem) => Math.max(it.w, it.h) / spreadCmS();
  for (;;) {
    let next: string | null = null;
    for (const [id, t] of ignitedAt) if (!done.has(id) && (next === null || t < (ignitedAt.get(next) as number))) next = id;
    if (next === null) break;
    done.add(next);
    const a = ROOM_ITEMS.find((i) => i.id === next) as RoomItem;
    const ta = ignitedAt.get(next) as number;
    const aEnds = Math.min(ta + burnTime(a), globalOutT);
    for (const b of ROOM_ITEMS) {
      if (b.id === a.id || done.has(b.id) || gapCm(a, b) > ILLUSTRATIVE.maxReachGapCm) continue;
      const tReach = ta + reachDistanceCm(a, b) / (spreadCmS() * directionFactor(a, b, opts.ventsOn));
      if (tReach >= aEnds || tReach > ILLUSTRATIVE.horizonS) continue;
      const rb = risks[b.id] as ItemRisk;
      if (!rb.tested) {
        if (tReach < (contacts.get(b.id) ?? Infinity)) contacts.set(b.id, tReach);
      } else if (rb.ignites && tReach < (ignitedAt.get(b.id) ?? Infinity)) {
        ignitedAt.set(b.id, tReach);
      }
    }
  }

  const timelines: ItemTimeline[] = [...ignitedAt].map(([itemId, t]) => {
    const it = ROOM_ITEMS.find((i) => i.id === itemId) as RoomItem;
    const burntOutAt = t + burnTime(it);
    return { itemId, ignitedAt: t, outAt: Math.min(burntOutAt, globalOutT), burntOutAt };
  });

  for (const tl of timelines) {
    events.push({ t: tl.ignitedAt, kind: tl.itemId === start.id ? "ignition" : "spread", itemId: tl.itemId, illustrative: tl.itemId !== start.id });
    if (tl.burntOutAt <= tl.outAt) events.push({ t: tl.burntOutAt, kind: "burnt-out", itemId: tl.itemId, illustrative: true });
  }
  for (const [itemId, t] of contacts) events.push({ t, kind: "untested-contact", itemId, illustrative: true });

  const lastOut = Math.max(...timelines.map((tl) => tl.outAt));
  if (detectT < lastOut) {
    events.push({ t: detectT, kind: "smoke-detected", illustrative: true });
    if (alarmT < lastOut) events.push({ t: alarmT, kind: "alarm", illustrative: true });
    if (opts.crewResponse) {
      if (opts.ventsOn && ventOffT < lastOut) events.push({ t: ventOffT, kind: "vent-shutdown", illustrative: true });
      if (extinguishT < lastOut) events.push({ t: extinguishT, kind: "extinguisher", illustrative: true });
    }
  }
  const selfOut = micro && Number.isFinite(globalOutT) && globalOutT <= lastOut + 1e-6 && (!opts.crewResponse || globalOutT < extinguishT + 5);
  if (Number.isFinite(lastOut)) events.push({ t: lastOut, kind: selfOut ? "self-extinguish" : "out", illustrative: true });

  events.sort((x, y) => x.t - y.t);
  return { ...base, timelines, contacts: [...contacts].map(([itemId, t]) => ({ itemId, t })), events, endT: lastOut + 6, evidenceIds };
}

export type ItemState =
  | { kind: "idle" }
  | { kind: "burning"; intensity: number; progress: number }
  | { kind: "out"; burnt: number }
  | { kind: "untested-contact" };

/** Scene state at simulation time t (seconds). */
export function stateAt(plan: FirePlan, t: number): { items: Record<string, ItemState>; smoke: number; alarm: boolean; ventsOn: boolean } {
  const items: Record<string, ItemState> = {};
  let burningCount = 0;
  for (const item of ROOM_ITEMS) {
    const tl = plan.timelines.find((x) => x.itemId === item.id);
    const contact = plan.contacts.find((x) => x.itemId === item.id);
    if (tl && t >= tl.ignitedAt) {
      const progress = Math.min(1, (t - tl.ignitedAt) / Math.max(1, tl.burntOutAt - tl.ignitedAt));
      if (t < tl.outAt) {
        const rampUp = Math.min(1, (t - tl.ignitedAt) / 3);
        const rampDown = Math.min(1, (tl.outAt - t) / 4);
        items[item.id] = { kind: "burning", intensity: Math.min(rampUp, rampDown), progress };
        burningCount++;
      } else {
        items[item.id] = { kind: "out", burnt: Math.min(1, (tl.outAt - tl.ignitedAt) / Math.max(1, tl.burntOutAt - tl.ignitedAt)) };
      }
    } else if (contact && t >= contact.t) {
      items[item.id] = { kind: "untested-contact" };
    } else {
      items[item.id] = { kind: "idle" };
    }
  }
  const alarmEvent = plan.events.find((e) => e.kind === "alarm");
  const ventOff = plan.events.find((e) => e.kind === "vent-shutdown");
  return {
    items,
    smoke: Math.min(1, burningCount * 0.35 + (burningCount > 0 ? 0.15 : 0)),
    alarm: Boolean(alarmEvent && t >= alarmEvent.t && burningCount > 0),
    ventsOn: plan.ventsOn && !(ventOff && t >= ventOff.t),
  };
}

export const EVENT_LABEL: Record<FireEventKind, string> = {
  ignition: "Ignition",
  "no-ignition": "No sustained fire in nearby runs",
  "untested-start": "No nearby real run",
  spread: "Fire spreads",
  "untested-contact": "Reaches untested item",
  "smoke-detected": "Smoke detected",
  alarm: "Alarm",
  "vent-shutdown": "Vents shut down",
  "self-extinguish": "Flame starves and goes out",
  extinguisher: "CO2 extinguisher",
  out: "Fire out",
  "burnt-out": "Item burnt out",
};

export function itemLabel(id: string | undefined): string {
  return ROOM_ITEMS.find((i) => i.id === id)?.label ?? "item";
}

export function materialLabel(id: string | undefined): string {
  const m = ROOM_ITEMS.find((i) => i.id === id)?.material;
  return m ? MATERIAL_LABEL[m].toLowerCase() : "material";
}

export function formatClock(t: number): string {
  const s = Math.max(0, Math.round(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
