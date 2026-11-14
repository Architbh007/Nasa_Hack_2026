import { describe, expect, it } from "vitest";
import { retrieve, tokenize } from "@/lib/ai/retrieval";
import { validateDataset } from "@/lib/validate";
import { readBuiltFiles } from "./fixtures";

const investigations = validateDataset(readBuiltFiles()).data!.investigations;
const ids = (q: string) => retrieve(q, investigations, 6).map((r) => r.investigation.id);

describe("retrieval over the real PSI records", () => {
  it("tokenizes and drops stopwords", () => {
    expect(tokenize("How does CO2 compare with helium?")).toEqual(["co2", "helium"]);
  });

  it("always returns six records", () => {
    expect(ids("anything at all")).toHaveLength(6);
  });

  it("finds FLEX for a CO2 vs helium suppressant question", () => {
    expect(ids("How does carbon dioxide compare with helium as a suppressant?")).toContain("flex");
  });

  it("finds the smoke-detection family", () => {
    expect(ids("How did DAFT help the SAME smoke experiment?").slice(0, 3)).toEqual(expect.arrayContaining(["daft", "same"]));
  });

  it("prefers solid-material records when the question is about solids", () => {
    const r = ids("Which real tests burned solid materials below 10 psi?");
    expect(r.slice(0, 3)).toEqual(expect.arrayContaining(["bass", "bass-ii"]));
    expect(r).toContain("saffire-iv-vi");
  });

  it("ranks a named investigation first", () => {
    expect(ids("Tell me about BASS-II")[0]).toBe("bass-ii");
    expect(ids("Where do cool flames appear in the CFI data?")[0]).toBe("cfi");
  });
});
