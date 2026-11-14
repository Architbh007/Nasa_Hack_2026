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
    description: "Compare a cabin atmosphere with real NASA tests",
    icon: "habitat",
  },
  {
    href: "/explore",
    label: "Investigation Explorer",
    description: "PSI records, real runs and their sources",
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
    href: "/scenarios",
    label: "Mission Readiness",
    description: "What real tests cover at each habitat atmosphere",
    icon: "scenarios",
  },
  {
    href: "/earth",
    label: "Earth Benefits",
    description: "Earth benefits as stated in PSI records",
    icon: "earth",
  },
  {
    href: "/about",
    label: "About & Sources",
    description: "Sources, data policy and methods",
    icon: "about",
  },
] as const;
