import { Gauge, Globe2, Info, TableProperties, type LucideProps } from "lucide-react";
import type { NavItem } from "@/lib/nav";

const ICONS: Record<NavItem["icon"], React.ComponentType<LucideProps>> = {
  habitat: Gauge,
  explore: TableProperties,
  earth: Globe2,
  about: Info,
};

export function NavIcon({
  name,
  ...props
}: { name: NavItem["icon"] } & LucideProps) {
  const Icon = ICONS[name];
  return <Icon aria-hidden {...props} />;
}
