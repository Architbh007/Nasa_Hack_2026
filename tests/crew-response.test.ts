import { describe, expect, it } from "vitest";
import {
  consequenceRows,
  extinguishedBreakdown,
  flowMapPoints,
  getResponseCoding,
  joinResponseEvents,
  responseCoverage,
  tallyResponses,
} from "@/lib/crew-response";
import { getDataset } from "@/lib/data";
import { makeRun } from "./fixtures";

const { runs, runById } = getDataset();
const coding = getResponseCoding();
const events = joinResponseEvents(coding.events, runs);

describe("crew response coding file", () => {
  it("is flagged as hand-coded and needing a human check", () => {
    expect(coding.kind).toBe("hand-coded-response-events");
    expect(coding.needsHumanVerification).toBe(true);
  });

  it("only refers to BASS runs that exist in the dataset", () => {
    for (const e of coding.events) {
      const run = runById.get(e.runId);
      expect(run, e.runId).toBeDefined();
      expect(run?.investigationId, e.runId).toBe("bass");
    }
  });

  it("quotes every event word for word from the run's note", () => {
    for (const e of coding.events) {
      const note = runById.get(e.runId)?.outcomeText ?? "";
      expect(note.includes(e.quote), `${e.runId}: "${e.quote}"`).toBe(true);
    }
  });

  it("codes each action at most once per run", () => {
    const keys = coding.events.map((e) => `${e.runId}|${e.action}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("tallyResponses", () => {
  it("counts results per action and the runs behind them", () => {
    const tally = tallyResponses([
      { runId: "a", action: "airflow-stopped", result: "went-out" },
      { runId: "b", action: "airflow-stopped", result: "went-out" },
      { runId: "a", action: "nitrogen", result: "kept-burning" },
      { runId: "c", action: "nitrogen", result: "partly-out" },
    ]);
    const stopped = tally.find((t) => t.action === "airflow-stopped");
    const nitrogen = tally.find((t) => t.action === "nitrogen");
    expect(stopped).toMatchObject({ total: 2, runs: 2, counts: { "went-out": 2, "partly-out": 0, "kept-burning": 0 } });
    expect(nitrogen).toMatchObject({ total: 2, runs: 2, counts: { "went-out": 0, "partly-out": 1, "kept-burning": 1 } });
    expect(tally.find((t) => t.action === "airflow-increased")?.total).toBe(0);
  });

  it("adds up to the number of coded events", () => {
    const tally = tallyResponses(events);
    expect(tally.reduce((s, t) => s + t.total, 0)).toBe(events.length);
    for (const t of tally) expect(t.counts["went-out"] + t.counts["partly-out"] + t.counts["kept-burning"]).toBe(t.total);
  });
});

describe("joinResponseEvents", () => {
  it("fails loudly when a coded run is missing", () => {
    expect(() => joinResponseEvents([{ runId: "no-such-run", action: "nitrogen", result: "went-out", quote: "x" }], runs)).toThrow(/no-such-run/);
  });
});

describe("responseCoverage", () => {
  it("reports the O2 range of the coded runs and the solid runs beyond it", () => {
    const cov = responseCoverage(events, runs);
    expect(cov.events).toBe(events.length);
    expect(cov.o2Range).not.toBeNull();
    const max = cov.o2Range?.max ?? 0;
    const above = runs.filter((r) => r.category === "solid" && r.o2Percent !== null && r.o2Percent > max).length;
    expect(cov.solidRunsAboveCodedO2).toBe(above);
    expect(cov.solidRunsWithFlow).toBeLessThanOrEqual(cov.solidRuns);
  });

  it("returns a null range when no coded run records O2", () => {
    const run = makeRun({ id: "r1", o2Percent: null });
    const joined = joinResponseEvents([{ runId: "r1", action: "nitrogen", result: "went-out", quote: "x" }], [run]);
    expect(responseCoverage(joined, [run]).o2Range).toBeNull();
  });
});

describe("flowMapPoints", () => {
  it("keeps only solid runs with O2 and a flow speed in cm/s", () => {
    const points = flowMapPoints([
      makeRun({ id: "ok", category: "solid", o2Percent: 21, flowMinCmS: 2, flowMaxCmS: 10 }),
      makeRun({ id: "no-flow", category: "solid", o2Percent: 21, flowMinCmS: null, flowMaxCmS: null, flowText: "10, etc" }),
      makeRun({ id: "no-o2", category: "solid", o2Percent: null, flowMinCmS: 2, flowMaxCmS: 10 }),
      makeRun({ id: "liquid", category: "liquid", o2Percent: 21, flowMinCmS: 2, flowMaxCmS: 10 }),
    ]);
    expect(points.map((p) => p.id)).toEqual(["ok"]);
  });
});

describe("consequenceRows", () => {
  it("lists only Saffire IV-VI burns with a published burn duration and keeps missing cells null", () => {
    const rows = consequenceRows(runs);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const run = runById.get(row.id);
      expect(run?.investigationId).toBe("saffire-iv-vi");
      expect(row.burnDurationS).toBe(run?.metrics.burnDurationS);
      expect(row.coIncreasePpm).toBe(run?.metrics.coIncreasePpm ?? null);
    }
    expect(consequenceRows([makeRun({ investigationId: "saffire-iv-vi", metrics: { burnDurationS: null } })])).toEqual([]);
  });
});

describe("extinguishedBreakdown", () => {
  it("counts each extinguished BASS run once and adds up to the total", () => {
    const b = extinguishedBreakdown(events, runs);
    expect(b.total).toBe(runs.filter((r) => r.investigationId === "bass" && r.outcome === "extinguished").length);
    expect(Object.values(b.counts).reduce((s, n) => s + n, 0)).toBe(b.total);
  });

  it("prefers airflow stopped when a run has more than one action that put the flame out", () => {
    const run = makeRun({ id: "r1", investigationId: "bass", outcome: "extinguished", outcomeBasis: "notes-keyword" });
    const b = extinguishedBreakdown(
      [
        { runId: "r1", action: "nitrogen", result: "went-out" },
        { runId: "r1", action: "airflow-stopped", result: "went-out" },
      ],
      [run, makeRun({ id: "r2", investigationId: "bass", outcome: "extinguished", outcomeBasis: "notes-keyword" })]
    );
    expect(b.counts["airflow-stopped"]).toBe(1);
    expect(b.counts["not-coded"]).toBe(1);
  });
});
