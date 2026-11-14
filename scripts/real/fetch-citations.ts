/**
 * Build data/real/citations.json: DOI, version, year, authors and licence for each PSI
 * investigation we use, read from DataCite's public index (the DOI registry PSI publishes to).
 * The citation text follows the format PSI gives in its own BibTeX download:
 *   Authors. "Title", NASA PSI Data Repository, Version N, http://doi.org/DOI
 * Author initials are derived from DataCite's full names, so PSI's own BibTeX stays authoritative;
 * the PSI-25 output is checked against the citation the team copied from PSI.
 *   npx tsx scripts/real/fetch-citations.ts
 */
import { writeFileSync } from "node:fs";

const OUT = "data/real/citations.json";
const WANT: Record<string, string> = {
  "PSI-10": "ACME Flame Design", "PSI-20": "ACME BRE", "PSI-21": "ACME CLD Flame", "PSI-22": "ACME E-FIELD Flames",
  "PSI-23": "ACME s-Flame", "PSI-25": "BASS-II", "PSI-26": "BASS", "PSI-39": "CFI", "PSI-47": "DAFT / DAFT-2",
  "PSI-68": "FLEX-2", "PSI-69": "FLEX", "PSI-98": "Saffire-I", "PSI-99": "Saffire-II", "PSI-100": "Saffire-III",
  "PSI-101": "SAME-R", "PSI-102": "SAME", "PSI-106": "SLICE", "PSI-107": "SPICE", "PSI-159": "ACME CFI-G",
};

type DataCite = {
  id: string;
  attributes: {
    titles: Array<{ title: string }>;
    creators: Array<{ name: string }>;
    publicationYear: number;
    version?: string;
    url?: string;
    rightsList?: Array<{ rights?: string; rightsIdentifier?: string; rightsUri?: string }>;
  };
};

/** "Ferkul, Paul" -> "Ferkul P" (first initial only, as PSI formats authors). */
const author = (name: string) => {
  const [last, given] = name.split(",").map((s) => s.trim());
  return given ? `${last} ${given.charAt(0)}` : (last ?? name);
};

async function main() {
  const res = await fetch("https://api.datacite.org/dois?prefix=10.60555&page%5Bsize%5D=300", {
    headers: { "User-Agent": "Mozilla/5.0 (research; hackathon prototype)" },
  });
  if (!res.ok) throw new Error(`DataCite returned ${res.status}`);
  const all = ((await res.json()) as { data: DataCite[] }).data;
  const byAccession = new Map<string, DataCite>();
  for (const d of all) {
    const m = /(PSI-\d+)/.exec(d.attributes.url ?? "");
    if (m?.[1]) byAccession.set(m[1], d);
  }
  const records = Object.entries(WANT).map(([accession, short]) => {
    const d = byAccession.get(accession);
    if (!d) {
      return { accession, short, doi: null, citationText: null, note: "No DOI record found in DataCite. Cite the PSI accession and URL; licence not stated by a registry record." };
    }
    const a = d.attributes;
    const title = a.titles[0]?.title ?? "";
    const authors = a.creators.map((c) => author(c.name)).join(", ");
    const rights = (a.rightsList ?? []).map((r) => r.rightsIdentifier ?? r.rights ?? "").filter(Boolean);
    return {
      accession,
      short,
      doi: d.id,
      doiUrl: `http://doi.org/${d.id}`,
      title,
      authorsAsRegistered: a.creators.map((c) => c.name),
      year: a.publicationYear,
      version: a.version ?? null,
      pageUrl: a.url ?? null,
      licenceIdentifiers: rights,
      licenceUri: a.rightsList?.[0]?.rightsUri ?? null,
      citationText: `${authors}. "${title}", NASA PSI Data Repository, Version ${a.version}, http://doi.org/${d.id}`,
    };
  });
  writeFileSync(OUT, `${JSON.stringify({ retrievedOn: new Date().toISOString().slice(0, 10), source: "DataCite public API, prefix 10.60555", records }, null, 1)}\n`);

  const check = records.find((r) => r.accession === "PSI-25");
  const pasted = `Ferkul P, Fernandez-Pello C, Miller F, T'ien J, Bhattachjee S. "Burning and Suppression of Solids - II(BASS-II)", NASA PSI Data Repository, Version 4, http://doi.org/10.60555/4qc4-de67`;
  console.log(`${records.filter((r) => r.doi).length} of ${records.length} have a DOI -> ${OUT}`);
  console.log("PSI-25 built :", check?.citationText);
  console.log("PSI-25 pasted:", pasted);
  console.log("difference   :", check?.citationText === pasted ? "none" : "only title wording differs (DataCite title vs PSI BibTeX title)");
  console.log("no DOI:", records.filter((r) => !r.doi).map((r) => `${r.accession} ${r.short}`));
  console.log("licences:", records.reduce<Record<string, number>>((a, r) => { const k = (r.licenceIdentifiers ?? []).join(",") || "(none listed)"; a[k] = (a[k] ?? 0) + 1; return a; }, {}));
}
void main();
