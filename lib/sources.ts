/**
 * Real, checked NASA web pages for each investigation (NASA Science, nasa.gov,
 * NASA SVS and the NASA Technical Reports Server). Links were verified on
 * 2026-11-14. The PSI portal is appended to every record as the data home.
 * These are links only; every number in the app comes from the PSI and paper data.
 */

export type SourceLink = { label: string; url: string };

export const PSI_PORTAL: SourceLink = { label: "NASA Physical Science Informatics (PSI) portal", url: "https://psi.nasa.gov" };

const ntrs = (id: string, title: string): SourceLink => ({ label: `NASA report: ${title}`, url: `https://ntrs.nasa.gov/citations/${id}` });
const nasaScience = (slug: string, title: string): SourceLink => ({
  label: `NASA Science: ${title}`,
  url: `https://science.nasa.gov/biological-physical/investigations/${slug}/`,
});

export const INVESTIGATION_SOURCES: Record<string, readonly SourceLink[]> = {
  bre: [nasaScience("bre", "Burning Rate Emulator (BRE)")],
  "cld-flame": [nasaScience("cld-flame", "Coflow Laminar Diffusion Flame (CLD Flame)")],
  "e-field-flames": [nasaScience("e-field-flames", "Electric-Field Effects on Laminar Diffusion Flames")],
  "s-flame": [nasaScience("s-flame", "Structure and Response of Spherical Flames (s-Flame)")],
  "cfi-g": [
    {
      label: "NASA: Cool Flames Created During a First for ISS Research (CFI-G)",
      url: "https://www.nasa.gov/missions/station/cool-flames-created-during-a-first-for-international-space-station-research/",
    },
    nasaScience("acme", "ACME facility"),
  ],
  flex: [
    ntrs("20150023456", "Detailed Results from the Flame Extinguishment Experiment (FLEX), 2009-2011"),
    ntrs("20090014812", "Multi-User Droplet Combustion Apparatus - Flame Extinguishment Experiment"),
  ],
  "flex-2": [{ label: "NASA SVS: Spherical Flames (FLEX-2)", url: "https://svs.gsfc.nasa.gov/11640" }],
  cfi: [
    ntrs("20205008449", "Cool-Flame Combustion of Normal-Alkane Droplets in Microgravity"),
    ntrs("20140006750", "Cool-flame Extinction During N-Alkane Droplet Combustion in Microgravity"),
  ],
  bass: [
    { label: "NASA: Combustion Continues to Draw Researchers to Space Station (BASS)", url: "https://www.nasa.gov/general/combustion-continues-to-draw-researchers-to-space-station/" },
    ntrs("20120017940", "Combustion, Complex Fluids, and Fluid Physics Experiments on the ISS"),
  ],
  "bass-ii": [
    ntrs("20210011385", "Burning and Suppression of Solids-II (BASS-II) Summary Report"),
    ntrs("20160000593", "Combustion of Solids in Microgravity: Results from the BASS-II Experiment"),
  ],
  spice: [ntrs("20140009169", "Gaseous Non-Premixed Flame Research Planned for the ISS (covers SPICE)")],
  slice: [
    ntrs("20140009169", "Gaseous Non-Premixed Flame Research Planned for the ISS (covers SLICE)"),
    ntrs("20120017940", "Combustion, Complex Fluids, and Fluid Physics Experiments on the ISS"),
  ],
  same: [ntrs("20070031686", "Particle and Smoke Detection on ISS for Next Generation Smoke Detectors (SAME)")],
  "same-r": [ntrs("20150010172", "Particle Morphology Results from the Smoke Aerosol Measurement Experiment-Reflight")],
  daft: [ntrs("20070031686", "Particle and Smoke Detection on ISS for Next Generation Smoke Detectors (DAFT)")],
  "saffire-iv-vi": [
    ntrs("20240002981", "Preliminary Results from the Saffire VI Experiment (ICES-2024-365)"),
    ntrs("20210011521", "Fire Safety Implications of Preliminary Results from Saffire IV and V Experiments (ICES 2021-266)"),
  ],
  "saffire-i": [
    ntrs("20170001636", "The Spacecraft Fire Experiment (Saffire): Objectives, Development and Status"),
    { label: "NASA: The Flame of Discovery Grows as Saffire Sets New Fires in Space", url: "https://www.nasa.gov/humans-in-space/the-flame-of-discovery-grows-as-saffire-sets-new-fires-in-space/" },
  ],
  "saffire-ii": [
    ntrs("20170000230", "Operation and Development Status of the Spacecraft Fire Experiments (Saffire)"),
    ntrs("20170001636", "The Spacecraft Fire Experiment (Saffire): Objectives, Development and Status"),
  ],
  "saffire-iii": [
    ntrs("20170000230", "Operation and Development Status of the Spacecraft Fire Experiments (Saffire)"),
    { label: "NASA: The Flame of Discovery Grows as Saffire Sets New Fires in Space", url: "https://www.nasa.gov/humans-in-space/the-flame-of-discovery-grows-as-saffire-sets-new-fires-in-space/" },
  ],
};

/** Ordered source URLs for a record: its own pages first, then the PSI portal. */
export function sourceUrlsFor(id: string): string[] {
  return [...(INVESTIGATION_SOURCES[id] ?? []).map((s) => s.url), PSI_PORTAL.url];
}

const LABEL_BY_URL = new Map<string, string>([
  [PSI_PORTAL.url, PSI_PORTAL.label],
  ...Object.values(INVESTIGATION_SOURCES).flatMap((list) => list.map((s) => [s.url, s.label] as const)),
]);

/** Human label for a source URL (falls back to the host name). */
export function sourceLabel(url: string): string {
  const known = LABEL_BY_URL.get(url);
  if (known) return known;
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/** Original NASA pages for an investigation id, then the PSI portal as the data home. */
export function sourcesForInvestigation(id: string): SourceLink[] {
  return [...(INVESTIGATION_SOURCES[id] ?? []), PSI_PORTAL];
}
