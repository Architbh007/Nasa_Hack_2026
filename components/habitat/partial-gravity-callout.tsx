import { Orbit } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GRAVITY_LABEL } from "@/lib/constants";
import type { HabitatGravity } from "@/lib/schema";

export function PartialGravityCallout({ gravity }: { gravity: HabitatGravity }) {
  if (gravity !== "lunar" && gravity !== "mars") return null;
  return (
    <Alert className="border-[#9085e9]/40 bg-[#9085e9]/10">
      <Orbit className="text-[#b3abf2]" aria-hidden />
      <AlertTitle>No combustion runs at {GRAVITY_LABEL[gravity]} in this dataset</AlertTitle>
      <AlertDescription className="text-sm leading-relaxed">
        Every run here was flown in microgravity (on the ISS or in a Cygnus vehicle). The coverage shown compares
        atmosphere only; gravity is not matched.
      </AlertDescription>
    </Alert>
  );
}
