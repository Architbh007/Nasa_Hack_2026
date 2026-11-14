/**
 * Save PSI investigation metadata for the combustion-science records to
 * data/real/psi-investigations.json.
 * Source: the read-only search endpoint that psi.nasa.gov's own front end uses (not a documented
 * public API, so it can change). Text is kept verbatim; only whitespace is tidied, and the
 * hardware field is normalized to a list.
 *   npx tsx scripts/real/fetch-psi-metadata.ts
 */
import { writeFileSync } from "node:fs";

const OUT = "data/real/psi-investigations.json";
const URL =
  "https://psi.nasa.gov/geode-py/ws/repo/search?q=&data_source=psi&data_type=investigation&ffield=Research%20Area&fvalue=combustion%20science&size=200";

type Hit = { _source: Record<string, unknown> };

const tidy = (v: unknown): string => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

function hardware(v: unknown): Array<{ name: string; links: string[] }> {
  const list = Array.isArray(v) ? v : v && typeof v === "object" ? [v] : [];
  return list
    .map((h) => {
      const o = h as { Name?: unknown; Link?: unknown };
      return { name: tidy(o.Name), links: tidy(o.Link).split(" ").filter((l) => /^https?:\/\//.test(l)) };
    })
    .filter((h) => h.name);
}

async function main() {
  const res = await fetch(URL, { headers: { "User-Agent": "Mozilla/5.0 (research; hackathon prototype)" } });
  if (!res.ok) throw new Error(`PSI search returned ${res.status}`);
  const body = (await res.json()) as { hits: { total: number; hits: Hit[] } };
  const records = body.hits.hits
    .map(({ _source: s }) => ({
      accession: tidy(s.Accession),
      title: tidy(s.Title),
      acronym: tidy(s.Acronym),
      projectType: tidy(s["Project Type"]),
      flightPlatform: tidy(s["Flight Platform"]),
      researchArea: tidy(s["Research Area"]),
      subResearchArea: tidy(s["SubResearch Area"]),
      relatedInvestigations: tidy(s["Related Investigations"]).split(" ").filter(Boolean),
      startDate: tidy(s["Investigation Start Date"]),
      endDate: tidy(s["Investigation End Date"]),
      monitoringCenter: tidy(s["Monitoring Center"]),
      keywords: tidy(s.Keywords),
      objectives: tidy(s.Objectives),
      approach: tidy(s.Approach),
      hypothesis: tidy(s.Hypothesis),
      earthBenefits: tidy(s["Research Impacts/Earth Benefits"]),
      hardware: hardware(s["Experiment Hardware"]),
      // PSI returns publication titles and authors run together in one string each.
      publicationTitlesRaw: tidy(s["Publication Title"]),
      publicationAuthorsRaw: tidy(s["Publication Author List"]),
      pageUrl: `https://psi.nasa.gov/physci/repo/data/investigations/${tidy(s.Accession)}`,
    }))
    .sort((a, b) => Number(a.accession.slice(4)) - Number(b.accession.slice(4)));
  writeFileSync(
    OUT,
    `${JSON.stringify({ retrievedOn: new Date().toISOString().slice(0, 10), source: URL, total: body.hits.total, records }, null, 1)}\n`
  );
  console.log(`${records.length} records (total reported ${body.hits.total}) -> ${OUT}`);
  console.log(records.map((r) => `${r.accession} ${r.acronym || "-"} [${r.projectType}]`).join("\n"));
}
void main();
