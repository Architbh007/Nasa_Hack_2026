export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon:
    | "habitat"
    | "explore"
    | "graph"
    | "ask"
    | "scenarios"
    | "earth"
    | "about";
};

export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: "/habitat",
    label: "Habitat Flammability",
    description: "Place a cabin atmosphere against tested combustion conditions",
    icon: "habitat",
  },
  {
    href: "/explore",
    label: "Investigation Explorer",
    description: "Filter, inspect and compare PSI combustion investigations",
    icon: "explore",
  },
  {
    href: "/graph",
    label: "Investigation Network",
    description: "See shared hardware, fuels and instruments as a graph",
    icon: "graph",
  },
  {
    href: "/ask",
    label: "Ask the Data",
    description: "Grounded Q&A over investigation records",
    icon: "ask",
  },
  {
    href: "/scenarios",
    label: "Mission Readiness",
    description: "Coverage scorecard for each habitat preset",
    icon: "scenarios",
  },
  {
    href: "/earth",
    label: "Earth Applications",
    description: "Spinoffs from microgravity combustion research",
    icon: "earth",
  },
  {
    href: "/about",
    label: "About & Methods",
    description: "Data policy, model, ranking and similarity methods",
    icon: "about",
  },
] as const;
