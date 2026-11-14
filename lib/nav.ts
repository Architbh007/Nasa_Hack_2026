export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: "habitat" | "explore" | "earth" | "about";
};

export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: "/habitat",
    label: "Habitat Flammability",
    description: "See how likely a cabin fire is, watch it play out, and check the evidence",
    icon: "habitat",
  },
  {
    href: "/explore",
    label: "Investigation Explorer",
    description: "Filter, inspect and compare PSI combustion investigations, plus spaceflight fire history",
    icon: "explore",
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
    description: "Data policy, model and ranking methods",
    icon: "about",
  },
] as const;
