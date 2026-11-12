import { describe, expect, it } from "vitest";
import { retrieve, tokenize } from "@/lib/ai/retrieval";
import { generateDataset } from "@/scripts/generator";

const { investigations } = generateDataset(42);
const ids = (q: string) => retrieve(q, investigations, 6).map((r) => r.investigation.id);

describe("retrieval", () => {
  it("tokenizes and drops stopwords", () => {
    expect(tokenize("How does CO2 compare with helium?")).toEqual(["co2", "helium"]);
  });

  it("always returns six records", () => {
    expect(ids("anything at all")).toHaveLength(6);
  });

  it("finds suppression studies for a CO2 vs helium question", () => {
    const r = ids("How does carbon dioxide compare with helium as a suppressant?");
    expect(r).toContain("flex");
    expect(r).toContain("s-flame");
  });

  it("finds the smoke and dust instrument family", () => {
    const r = ids("Which instruments were reused between smoke and dust experiments?");
    expect(r).toEqual(expect.arrayContaining(["same", "daft"]));
  });

  it("prefers solid-fuel records when the question is about solids", () => {
    const r = ids("Which investigations tested solid fuels at reduced pressure?");
    expect(r.slice(0, 3)).toEqual(expect.arrayContaining(["bass", "bass-ii"]));
    expect(r.filter((id) => ["bre", "flex-2", "cfi"].includes(id))).toHaveLength(0);
  });

  it("ranks a named investigation first", () => {
    expect(ids("Tell me about BASS-II")[0]).toBe("bass-ii");
    expect(ids("lunar regolith simulant dust")).toContain("daft-2");
  });
});
