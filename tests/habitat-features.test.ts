import { describe, expect, it } from "vitest";
import { citesOnly, fireTwinNarrationSchema } from "@/lib/ai/schemas";
import { FIRE_EVENTS } from "@/lib/fire-history";
import { gapCm, planFire, ROOM_ITEMS, stateAt } from "@/lib/fire-twin";
import { eventCaption } from "@/lib/fire-twin-narration";
import { buildFlammabilityGrid, cellAt, evidenceRuns, GRID_O2, GRID_PRESSURE, levelFor, nearestEvidence } from "@/lib/flammability-grid";
import type { HabitatInputs } from "@/lib/habitat";
import { fitIgnitionModel } from "@/lib/model";
import { INVESTIGATION_SOURCES, PSI_PORTAL, sourceUrlsFor } from "@/lib/sources";
import { generateDataset } from "@/scripts/generator";

const dataset = generateDataset(42);
const model = fitIgnitionModel(dataset.tests, dataset.investigations);
const data = { model, investigations: dataset.investigations, tests: dataset.tests };
const ids = new Set(dataset.investigations.map((i) => i.id));

const iss: HabitatInputs = { o2Percent: 21, pressurePsi: 14.7, materialClass: "fabric", airflow: "ventilated", gravity: "micro" };
const lunar: HabitatInputs = { o2Percent: 34, pressurePsi: 8.2, materialClass: "fabric", airflow: "ventilated", gravity: "lunar" };

describe("flammability grid", () => {
  const grid = buildFlammabilityGrid(model, dataset.investigations, dataset.tests, { materialClass: "fabric", airflow: "ventilated" });

  it("is a 12 x 12 square over the configured ranges", () => {
    expect(grid.columns).toBe(12);
    expect(grid.rows).toBe(12);
    expect(grid.cells).toHaveLength(144);
    expect(grid.cells[0]).toMatchObject({ o2Min: GRID_O2.min, pMin: GRID_PRESSURE.min });
  });

  it("colours by the ignition model with three levels", () => {
    expect(levelFor(0.1)).toBe("unlikely");
    expect(levelFor(0.5)).toBe("possible");
    expect(levelFor(0.9)).toBe("likely");
    for (const c of grid.cells) expect(c.level).toBe(levelFor(c.probability));
    // More oxygen at the same pressure never lowers the predicted risk.
    const row = grid.cells.filter((c) => c.row === 5);
    for (let i = 1; i < row.length; i++) expect(row[i]!.probability).toBeGreaterThanOrEqual(row[i - 1]!.probability);
  });

  it("marks a cell tested only when same-material runs fall inside it", () => {
    for (const c of grid.cells) {
      expect(c.tested).toBe(c.runs.length > 0);
      for (const r of c.runs) {
        expect(r.o2Percent).toBeGreaterThanOrEqual(c.o2Min);
        expect(r.pressurePsi).toBeGreaterThanOrEqual(c.pMin);
      }
    }
    expect(grid.cells.some((c) => c.tested)).toBe(true);
    expect(grid.cells.some((c) => !c.tested)).toBe(true);
  });

  it("shows the lunar base square as untested for fabric (the deliberate gap)", () => {
    const cell = cellAt(grid, lunar.o2Percent, lunar.pressurePsi);
    expect(cell).not.toBeNull();
    expect(cell!.tested).toBe(false);
  });

  it("reports cabins above the O2 range as off-chart", () => {
    expect(cellAt(grid, 100, 4.3)).toBeNull();
  });

  it("treats foam and wire insulation as never ignition-tested", () => {
    for (const m of ["foam", "wire-insulation"] as const) {
      const g = buildFlammabilityGrid(model, dataset.investigations, dataset.tests, { materialClass: m, airflow: "ventilated" });
      expect(g.materialTested).toBe(false);
      expect(g.cells.every((c) => !c.tested)).toBe(true);
    }
  });

  it("uses only same-material ignition-study runs as evidence", () => {
    const runs = evidenceRuns("plastic", dataset.investigations, dataset.tests);
    expect(runs.length).toBeGreaterThan(0);
    expect(runs.every((r) => !["same", "same-r", "daft", "daft-2"].includes(r.investigationId))).toBe(true);
    const near = nearestEvidence(runs, { o2Percent: 21, pressurePsi: 14.7 }, 5);
    expect(near).toHaveLength(5);
    for (let i = 1; i < near.length; i++) expect(near[i]!.distance).toBeGreaterThanOrEqual(near[i - 1]!.distance);
  });
});

describe("fire twin", () => {
  it("lays out items that do not overlap", () => {
    for (const a of ROOM_ITEMS) for (const b of ROOM_ITEMS) if (a !== b) expect(gapCm(a, b)).toBeGreaterThan(0);
  });

  it("is deterministic and orders events in time", () => {
    const a = planFire(iss, "stowage-bag", { ventsOn: true, crewResponse: true }, data);
    const b = planFire(iss, "stowage-bag", { ventsOn: true, crewResponse: true }, data);
    expect(a.events).toEqual(b.events);
    for (let i = 1; i < a.events.length; i++) expect(a.events[i]!.t).toBeGreaterThanOrEqual(a.events[i - 1]!.t);
    expect(a.events[0]).toMatchObject({ kind: "ignition", t: 0, illustrative: false });
  });

  it("starves a microgravity flame after the vents stop, but needs an extinguisher at lunar gravity", () => {
    const micro = planFire(iss, "stowage-bag", { ventsOn: true, crewResponse: true }, data);
    expect(micro.events.some((e) => e.kind === "self-extinguish")).toBe(true);
    const moon = planFire(lunar, "stowage-bag", { ventsOn: true, crewResponse: true }, data);
    expect(moon.events.some((e) => e.kind === "extinguisher")).toBe(true);
  });

  it("spreads further without a crew response, and never ignites untested items", () => {
    const crew = planFire(lunar, "stowage-bag", { ventsOn: true, crewResponse: true }, data);
    const none = planFire(lunar, "stowage-bag", { ventsOn: true, crewResponse: false }, data);
    expect(none.timelines.length).toBeGreaterThan(crew.timelines.length);
    const untested = ROOM_ITEMS.filter((i) => i.material === "foam" || i.material === "wire-insulation").map((i) => i.id);
    expect(none.timelines.some((tl) => untested.includes(tl.itemId))).toBe(false);
    expect(none.contacts.length).toBeGreaterThan(0);
  });

  it("refuses to start a fire on an untested material", () => {
    const p = planFire(iss, "foam-seat", { ventsOn: true, crewResponse: true }, data);
    expect(p.events).toEqual([{ t: 0, kind: "untested-start", itemId: "foam-seat", illustrative: false }]);
    expect(p.timelines).toHaveLength(0);
  });

  it("marks crew and detection timings as illustrative", () => {
    const p = planFire(lunar, "stowage-bag", { ventsOn: true, crewResponse: true }, data);
    for (const e of p.events) {
      if (["smoke-detected", "alarm", "vent-shutdown", "extinguisher"].includes(e.kind)) expect(e.illustrative).toBe(true);
    }
  });

  it("reports burning state while lit and out afterwards", () => {
    const p = planFire(iss, "stowage-bag", { ventsOn: true, crewResponse: true }, data);
    expect(stateAt(p, 10).items["stowage-bag"]?.kind).toBe("burning");
    expect(stateAt(p, p.endT).items["stowage-bag"]?.kind).toBe("out");
  });

  it("writes captions that cite only real investigation ids", () => {
    const p = planFire(lunar, "stowage-bag", { ventsOn: true, crewResponse: false }, data);
    for (const e of p.events) expect(citesOnly(ids)(eventCaption(p, e))).toBe(true);
  });
});

describe("sources and history", () => {
  it("has real NASA links for every investigation, plus the PSI portal", () => {
    for (const inv of dataset.investigations) {
      expect(INVESTIGATION_SOURCES[inv.id]?.length ?? 0).toBeGreaterThan(0);
      expect(inv.sourceUrls).toEqual(sourceUrlsFor(inv.id));
      expect(inv.sourceUrls.at(-1)).toBe(PSI_PORTAL.url);
      for (const u of inv.sourceUrls) expect(new URL(u).hostname).toMatch(/(^|\.)nasa\.gov$/);
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
