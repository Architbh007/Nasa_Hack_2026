import { describe, expect, it } from "vitest";
import { citesOnly, fireTwinNarrationSchema } from "@/lib/ai/schemas";
import { FIRE_EVENTS } from "@/lib/fire-history";
import { gapCm, ILLUSTRATIVE, itemRisks, planFire, ROOM_ITEMS, stateAt } from "@/lib/fire-twin";
import { eventCaption } from "@/lib/fire-twin-narration";
import { buildFlammabilityGrid, cellAt, evidenceRuns, GRID_O2, GRID_PRESSURE, nearestEvidence, toneOf } from "@/lib/flammability-grid";
import type { HabitatInputs } from "@/lib/habitat";
import { NEAR_DISTANCE } from "@/lib/metrics";
import { INVESTIGATION_SOURCES, PSI_PORTAL, sourcesForInvestigation } from "@/lib/sources";
import { validateDataset } from "@/lib/validate";
import { readBuiltFiles } from "./fixtures";

const { investigations, runs } = validateDataset(readBuiltFiles()).data!;
const data = { runs };
const ids = new Set(investigations.map((i) => i.id));

const iss: HabitatInputs = { o2Percent: 21, pressurePsi: 14.7, materialClass: "fabric", airflow: "ventilated", gravity: "micro" };
const lunar: HabitatInputs = { o2Percent: 34, pressurePsi: 8.2, materialClass: "fabric", airflow: "ventilated", gravity: "lunar" };

describe("flammability grid on the real runs", () => {
  const grid = buildFlammabilityGrid(runs, { materialClass: "fabric" });

  it("is a 12 x 12 square over the configured ranges", () => {
    expect(grid.columns).toBe(12);
    expect(grid.rows).toBe(12);
    expect(grid.cells).toHaveLength(144);
    expect(grid.cells[0]).toMatchObject({ o2Min: GRID_O2.min, pMin: GRID_PRESSURE.min });
  });

  it("marks a square tested only when real runs of that material fall inside it", () => {
    for (const c of grid.cells) {
      expect(c.status === "tested").toBe(c.runs.length > 0);
      expect(c.tone === null).toBe(c.status !== "tested");
      for (const r of c.runs) {
        expect(r.o2Percent).toBeGreaterThanOrEqual(c.o2Min);
        expect(r.pressurePsi).toBeGreaterThanOrEqual(c.pMin);
      }
      if (c.status === "near") expect(c.nearestDistance!).toBeLessThanOrEqual(NEAR_DISTANCE);
      if (c.status === "untested") expect(c.nearestDistance === null || c.nearestDistance > NEAR_DISTANCE).toBe(true);
    }
    expect(grid.cells.some((c) => c.status === "tested")).toBe(true);
    expect(grid.cells.some((c) => c.status === "untested")).toBe(true);
  });

  it("colours a tested square only by what its runs recorded", () => {
    expect(toneOf({ burned: 2 })).toBe("burned");
    expect(toneOf({ extinguished: 3, blowoff: 1, "no-ignition": 1 })).toBe("extinguished");
    expect(toneOf({ burned: 1, extinguished: 1 })).toBe("mixed");
    expect(toneOf({ unknown: 4 })).toBe("unstated");
    for (const c of grid.cells.filter((x) => x.status === "tested")) {
      const total = Object.values(c.counts).reduce((s, n) => s + (n ?? 0), 0);
      expect(total).toBe(c.runs.length);
    }
  });

  it("never reports a probability", () => {
    const keys = new Set(grid.cells.flatMap((c) => Object.keys(c)));
    expect([...keys].some((k) => /probab|likel|risk/i.test(k))).toBe(false);
  });

  it("does not call the lunar base square tested for fabric", () => {
    const cell = cellAt(grid, lunar.o2Percent, lunar.pressurePsi);
    expect(cell).not.toBeNull();
    expect(cell!.status).not.toBe("tested");
  });

  it("reports cabins above the O2 range as off-chart", () => {
    expect(cellAt(grid, 100, 4.3)).toBeNull();
  });

  it("has no real run for foam, wire insulation or gas", () => {
    for (const m of ["foam", "wire-insulation", "gas-leak"] as const) {
      const g = buildFlammabilityGrid(runs, { materialClass: m });
      expect(g.materialTested).toBe(false);
      expect(g.cells.every((c) => c.status === "untested")).toBe(true);
    }
  });

  it("uses only same-material runs as evidence for solids", () => {
    const plastic = evidenceRuns("plastic", runs);
    expect(plastic.length).toBeGreaterThan(0);
    expect(plastic.every((r) => r.category === "solid" && r.materialClass === "plastic")).toBe(true);
    const near = nearestEvidence(plastic, { o2Percent: 21, pressurePsi: 14.7 }, 5);
    expect(near).toHaveLength(5);
    for (let i = 1; i < near.length; i++) expect(near[i]!.distance).toBeGreaterThanOrEqual(near[i - 1]!.distance);
  });
});

describe("fire twin on the real runs", () => {
  it("lays out items that do not overlap", () => {
    for (const a of ROOM_ITEMS) for (const b of ROOM_ITEMS) if (a !== b) expect(gapCm(a, b)).toBeGreaterThan(0);
  });

  it("decides each item only from nearby real runs that state an outcome", () => {
    for (const inputs of [iss, lunar]) {
      for (const risk of Object.values(itemRisks(inputs, data))) {
        if (!risk.tested) {
          expect(risk.evidence).toBeNull();
          expect(risk.ignites).toBeNull();
        } else {
          expect(risk.evidence!.considered).toBeGreaterThan(0);
          expect(risk.ignites).toBe(risk.evidence!.burned > 0);
          expect(risk.evidence!.burned + risk.evidence!.wentOut).toBeLessThanOrEqual(risk.evidence!.considered);
        }
      }
    }
  });

  it("treats foam and wire insulation as having no evidence", () => {
    const risks = itemRisks(iss, data);
    expect(risks["foam-seat"]?.tested).toBe(false);
    expect(risks["wire-bundle"]?.tested).toBe(false);
  });

  it("is deterministic and orders events in time", () => {
    const a = planFire(lunar, "stowage-bag", { ventsOn: true, crewResponse: true }, data);
    const b = planFire(lunar, "stowage-bag", { ventsOn: true, crewResponse: true }, data);
    expect(a.events).toEqual(b.events);
    for (let i = 1; i < a.events.length; i++) expect(a.events[i]!.t).toBeGreaterThanOrEqual(a.events[i - 1]!.t);
  });

  it("refuses to start a fire on a material with no nearby real run", () => {
    const p = planFire(iss, "foam-seat", { ventsOn: true, crewResponse: true }, data);
    expect(p.events).toEqual([{ t: 0, kind: "untested-start", itemId: "foam-seat", illustrative: false }]);
    expect(p.timelines).toHaveLength(0);
  });

  it("only ignites an item when a nearby real run burned, and never ignites untested items", () => {
    for (const inputs of [iss, lunar]) {
      for (const item of ROOM_ITEMS) {
        const p = planFire(inputs, item.id, { ventsOn: true, crewResponse: false }, data);
        for (const tl of p.timelines) {
          expect(p.risks[tl.itemId]?.ignites).toBe(true);
          expect(p.risks[tl.itemId]?.evidence?.burned).toBeGreaterThan(0);
        }
      }
    }
  });

  it("marks spread, smoke, crew and burn-out timings as illustrative", () => {
    expect(ILLUSTRATIVE.spreadMmS).toBeGreaterThan(0);
    for (const inputs of [iss, lunar]) {
      for (const item of ROOM_ITEMS) {
        const p = planFire(inputs, item.id, { ventsOn: true, crewResponse: true }, data);
        for (const e of p.events) {
          if (["spread", "burnt-out", "smoke-detected", "alarm", "vent-shutdown", "extinguisher", "out", "self-extinguish"].includes(e.kind)) {
            expect(e.illustrative).toBe(true);
          }
          if (e.kind === "ignition") expect(e.illustrative).toBe(false);
        }
      }
    }
  });

  it("reports burning while lit and out afterwards for any fire that starts", () => {
    const start = ROOM_ITEMS.find((item) => planFire(lunar, item.id, { ventsOn: true, crewResponse: true }, data).timelines.length > 0);
    if (!start) return; // no real run near this air burned: nothing to animate
    const p = planFire(lunar, start.id, { ventsOn: true, crewResponse: true }, data);
    expect(stateAt(p, 1).items[start.id]?.kind).toBe("burning");
    expect(stateAt(p, p.endT).items[start.id]?.kind).toBe("out");
  });

  it("writes captions that cite only real investigation ids and never a probability", () => {
    for (const item of ROOM_ITEMS) {
      const p = planFire(lunar, item.id, { ventsOn: true, crewResponse: false }, data);
      for (const e of p.events) {
        const caption = eventCaption(p, e);
        expect(citesOnly(ids)(caption)).toBe(true);
        expect(caption).not.toMatch(/probab|chance of ignit|synthetic/i);
      }
    }
  });
});

describe("sources and history", () => {
  it("has NASA links for the investigations it names, all on nasa.gov", () => {
    for (const [id, links] of Object.entries(INVESTIGATION_SOURCES)) {
      expect(ids.has(id)).toBe(true);
      expect(links.length).toBeGreaterThan(0);
      for (const l of links) expect(new URL(l.url).hostname).toMatch(/(^|\.)nasa\.gov$/);
    }
  });

  it("ends every investigation's source list with the PSI portal", () => {
    for (const inv of investigations) {
      const list = sourcesForInvestigation(inv.id);
      expect(list.at(-1)).toEqual(PSI_PORTAL);
    }
  });

  it("links every history event to existing investigations and NASA sources", () => {
    for (const e of FIRE_EVENTS) {
      expect(e.relatedInvestigationIds.every((id) => ids.has(id))).toBe(true);
      expect(e.sources.length).toBeGreaterThan(0);
      for (const s of e.sources) expect(new URL(s.url).hostname).toMatch(/(^|\.)nasa\.gov$/);
    }
  });

  it("rejects SI narration that cites ids outside the allowed list", () => {
    const schema = fireTwinNarrationSchema(new Set(["bass"]));
    expect(schema.safeParse({ narration: "Out [bass].", takeaway: "t", testNext: "n" }).success).toBe(true);
    expect(schema.safeParse({ narration: "Out [made-up].", takeaway: "t", testNext: "n" }).success).toBe(false);
  });
});
