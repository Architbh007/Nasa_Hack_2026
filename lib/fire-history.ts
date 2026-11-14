/**
 * Then vs Now: real spaceflight fire events and milestone experiments.
 * Every fact here is written from the linked NASA pages (checked 2026-11-14).
 * This is real history, unlike the synthetic numbers in the dataset.
 */

export type FireHistorySource = { label: string; url: string };

export type FireHistoryEvent = {
  id: string;
  year: number;
  dateLabel: string;
  title: string;
  kind: "incident" | "experiment" | "standard";
  /** What happened. */
  then: string;
  /** Cabin or test atmosphere at the time, when the sources state it. */
  atmosphere: string | null;
  whatWentWrong: string | null;
  /** What research and design changed afterwards. */
  now: string;
  relatedInvestigationIds: readonly string[];
  sources: readonly FireHistorySource[];
};

export const FIRE_EVENTS: readonly FireHistoryEvent[] = [
  {
    id: "apollo-1",
    year: 1967,
    dateLabel: "27 January 1967",
    title: "Apollo 1 fire on the launch pad",
    kind: "incident",
    then:
      "During a preflight test of Apollo 204 (AS-204) on the launch pad at Cape Kennedy, a flash fire swept through the sealed command module. Astronauts Virgil Grissom, Edward White and Roger Chaffee were killed.",
    atmosphere: "Pure oxygen at 16.7 psi, slightly above the outside air pressure.",
    whatWentWrong:
      "Investigators found evidence of arcing in several wires under Grissom's couch. The pure-oxygen cabin and a larger-than-allowable amount of flammable material let the fire spread very fast, and the inward-opening inner hatch took 90 seconds to open under ideal conditions; the cabin pressure made it impossible.",
    now:
      "NASA severely restricted the amount and location of combustible material, protected wiring bundles, introduced flame-resistant spacesuits and a single hatch that opens in three seconds, and replaced the 100% oxygen pre-launch atmosphere with 60% oxygen and 40% nitrogen.",
    relatedInvestigationIds: ["bass", "bass-ii", "saffire-i"],
    sources: [
      { label: "NASA: 55 Years Ago: The Apollo 1 Fire and its Aftermath", url: "https://www.nasa.gov/history/55-years-ago-the-apollo-1-fire-and-its-aftermath/" },
      { label: "NASA: Apollo 1 mission page", url: "https://www.nasa.gov/mission/apollo-1/" },
      { label: "NASA SP-350: Apollo Expeditions to the Moon, chapter 4", url: "https://history.nasa.gov/SP-350/ch-4-5.html" },
    ],
  },
  {
    id: "mir-1997",
    year: 1997,
    dateLabel: "February 1997",
    title: "Fire aboard space station Mir",
    kind: "incident",
    then:
      "A solid-fuel oxygen generator canister in the Kvant-1 module ignited as a cosmonaut activated it, with six crew members aboard, including NASA astronaut Jerry Linenger. The flame lasted several minutes.",
    atmosphere: "Earth-like cabin air on a crewed space station; the fire was fed by an oxygen-generating canister.",
    whatWentWrong:
      "The crew had to put on oxygen masks while smoke filled the station's modules. The narrow space made the fire hard to fight, the flame blocked the route to one Soyuz escape vehicle, and it took foam from three extinguishers. Life support needed several hours to clear the smoke.",
    now:
      "NASA says the lessons were passed on to the design and operations of the International Space Station. Russian officials changed crew emergency training, ground support and how oxygen-generator canisters are prepared. On the ISS, NASA's DAFT and SAME experiments measured background dust and smoke particles to design better spacecraft smoke detectors.",
    relatedInvestigationIds: ["same", "same-r", "daft"],
    sources: [
      { label: "NASA: 25 Years Ago: Fire Aboard Space Station Mir", url: "https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/" },
      { label: "NASA report: Particle and Smoke Detection on ISS for Next Generation Smoke Detectors", url: "https://ntrs.nasa.gov/citations/20070031686" },
    ],
  },
  {
    id: "flex-2009",
    year: 2009,
    dateLabel: "2009 to 2011",
    title: "FLEX: putting out flames in orbit",
    kind: "experiment",
    then:
      "The Flame Extinguishment Experiment burned small fuel droplets inside the Combustion Integrated Rack on the ISS to measure how well different gases and atmospheres put flames out.",
    atmosphere: "Controlled test atmospheres inside a sealed combustion chamber, including candidate crew exploration atmospheres.",
    whatWentWrong: null,
    now:
      "FLEX gave data on fire suppressants in microgravity and how possible exploration atmospheres affect suppression, and its droplet tests led to the discovery of 'cool flames' that burn at much lower temperatures.",
    relatedInvestigationIds: ["flex", "flex-2", "cfi"],
    sources: [
      { label: "NASA report: Detailed Results from the Flame Extinguishment Experiment (FLEX)", url: "https://ntrs.nasa.gov/citations/20150023456" },
      { label: "NASA report: Multi-User Droplet Combustion Apparatus - Flame Extinguishment Experiment", url: "https://ntrs.nasa.gov/citations/20090014812" },
    ],
  },
  {
    id: "bass-2012",
    year: 2012,
    dateLabel: "2012 to 2014",
    title: "BASS: how solid materials burn in microgravity",
    kind: "experiment",
    then:
      "Burning and Suppression of Solids and its follow-on BASS-II burned small samples of spacecraft materials in the ISS Microgravity Science Glovebox, varying oxygen level, airflow and fuel type.",
    atmosphere: "Glovebox tests with oxygen concentration, ventilation flow speed and nitrogen dilution as controlled variables.",
    whatWentWrong: null,
    now:
      "The results feed material flammability limits and suppression guidance for crewed vehicles: how airflow and oxygen level control whether a flame on a solid survives.",
    relatedInvestigationIds: ["bass", "bass-ii", "spice"],
    sources: [
      { label: "NASA report: Burning and Suppression of Solids-II (BASS-II) Summary Report", url: "https://ntrs.nasa.gov/citations/20210011385" },
      { label: "NASA report: Combustion of Solids in Microgravity: Results from the BASS-II Experiment", url: "https://ntrs.nasa.gov/citations/20160000593" },
    ],
  },
  {
    id: "saffire-2016",
    year: 2016,
    dateLabel: "2016 to 2024",
    title: "Saffire: large fires on purpose, far from the crew",
    kind: "experiment",
    then:
      "The Spacecraft Fire Experiments lit material samples at realistic spacecraft fire sizes inside uncrewed Cygnus cargo ships after they left the ISS, so no crew were at risk.",
    atmosphere: "Spacecraft cabin conditions; later runs tested lower pressures and higher oxygen like future exploration vehicles.",
    whatWentWrong: null,
    now:
      "Saffire measured how fast a large fire grows in low gravity, the gap that small lab tests could not close. The series ended in early 2024 and informs fire safety for Moon and Mars vehicles.",
    relatedInvestigationIds: ["saffire-i", "saffire-ii", "saffire-iii"],
    sources: [
      { label: "NASA report: Operation and Development Status of the Spacecraft Fire Experiments (Saffire)", url: "https://ntrs.nasa.gov/citations/20170000230" },
      { label: "NASA: The Flame of Discovery Grows as Saffire Sets New Fires in Space", url: "https://www.nasa.gov/humans-in-space/the-flame-of-discovery-grows-as-saffire-sets-new-fires-in-space/" },
    ],
  },
  {
    id: "exploration-atmosphere",
    year: 2024,
    dateLabel: "Today",
    title: "Moon and Mars: a new, oxygen-richer cabin air",
    kind: "standard",
    then:
      "The ISS, Shuttle and most other stations used sea-level air (14.7 psi, 21% oxygen). Early vehicles from Mercury to Apollo used 5 psi pure oxygen in flight.",
    atmosphere: "Proposed exploration atmospheres use lower pressure with more oxygen, around 8 psi with roughly a third oxygen, so spacewalks need less preparation.",
    whatWentWrong: null,
    now:
      "More oxygen makes materials easier to ignite, so every material choice for Artemis-era habitats depends on flammability data at these conditions. That is exactly the evidence gap FireSight shows on the Habitat page.",
    relatedInvestigationIds: ["bass-ii", "saffire-ii", "bre"],
    sources: [
      { label: "NASA report: Moon to Mars (M2M): Exploration Atmosphere", url: "https://ntrs.nasa.gov/citations/20240003211" },
      { label: "NASA report: Evidence Report: Risk of Hypobaric Hypoxia from the Exploration Atmosphere", url: "https://ntrs.nasa.gov/citations/20150021491" },
    ],
  },
];
