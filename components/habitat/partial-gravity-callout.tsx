import Link from "next/link";
import { Orbit } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GRAVITY_LABEL } from "@/lib/constants";
import type { HabitatGravity } from "@/lib/schema";

export function PartialGravityCallout({ gravity }: { gravity: HabitatGravity }) {
  if (gravity !== "lunar" && gravity !== "mars") return null;
  return (
    <Alert className="border-link/30 bg-[oklch(0.22_0.015_235/0.85)]">
      <Orbit className="text-link" aria-hidden />
      <AlertTitle>No partial-gravity combustion data for {GRAVITY_LABEL[gravity]}</AlertTitle>
      <AlertDescription className="space-y-1.5 text-sm leading-relaxed">
        <p>
          PSI currently holds no combustion runs at lunar or Mars gravity, so these results are bounded by microgravity
          and normal-gravity data rather than measured directly. Buoyant flow at partial gravity is expected to fall between the two.
        </p>
        <p>
          <Link href="/explore?id=e-field-flames" className="text-link hover:underline">E-FIELD Flames</Link> uses electric
          fields as a simulated partial-gravity proxy. LUCI and FM2 are expected future data sources for true partial-gravity combustion.
        </p>
      </AlertDescription>
    </Alert>
  );
}
