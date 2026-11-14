export type NavItem = {
  href: string;
  label: string;
  description: string;
};

/** Mission Readiness (/scenarios) is left out of the nav on this branch; its logic still feeds the habitat verdicts. */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: "/habitat",
    label: "Habitat Flammability",
    description: "See which cabin atmospheres real tests cover, watch a fire play out, and check the evidence",
  },
  {
    href: "/response",
    label: "Crew Response",
    description: "What real flames did when crews cut the airflow or used nitrogen, with the notes behind every count",
  },
  {
    href: "/planner",
    label: "Experiment Planner",
    description: "Which fire tests NASA should fly next to cover Moon and Mars cabin air, built out from the real runs",
  },
  {
    href: "/explore",
    label: "Investigation Explorer",
    description: "PSI records, real runs and their sources, plus spaceflight fire history",
  },
  {
    href: "/ask",
    label: "Ask the Data",
    description: "Grounded Q&A over the records, with citations",
  },
  {
    href: "/earth",
    label: "Earth Applications",
    description: "Spinoffs from microgravity combustion research, as stated in PSI records",
  },
] as const;
