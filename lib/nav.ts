export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: "habitat" | "explore" | "graph" | "ask" | "earth" | "about";
};

/** Mission Readiness (/scenarios) is left out of the nav on this branch; its logic still feeds the habitat verdicts. */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: "/habitat",
    label: "Habitat Flammability",
    description: "See which cabin atmospheres real tests cover, watch a fire play out, and check the evidence",
    icon: "habitat",
  },
  {
    href: "/explore",
    label: "Investigation Explorer",
    description: "PSI records, real runs and their sources, plus spaceflight fire history",
    icon: "explore",
  },
  {
    href: "/graph",
    label: "Investigation Network",
    description: "PSI-listed relations, shared hardware and projects",
    icon: "graph",
  },
  {
    href: "/ask",
    label: "Ask the Data",
    description: "Grounded Q&A over the records, with citations",
    icon: "ask",
  },
  {
    href: "/earth",
    label: "Earth Applications",
    description: "Spinoffs from microgravity combustion research, as stated in PSI records",
    icon: "earth",
  },
  {
    href: "/about",
    label: "About & Sources",
    description: "Sources, data policy and methods",
    icon: "about",
  },
] as const;
