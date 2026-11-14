import { GRAVITY_LABEL, MATERIAL_LABEL } from "@/lib/constants";
import { EVENT_LABEL, itemLabel, materialLabel, type FireEvent, type FirePlan } from "@/lib/fire-twin";

/**
 * Plain-words captions for each Fire Twin event, generated from the plan's own
 * numbers. Citations use investigation ids in brackets so the UI links them.
 */

const pct = (p: number | null | undefined) => (p == null ? "?" : `${Math.round(p * 100)}%`);
const cite = (ids: readonly string[]) => (ids.length ? ` [${ids.join(", ")}]` : "");

export function eventCaption(plan: FirePlan, e: FireEvent): string {
  const risk = e.itemId ? plan.risks[e.itemId] : undefined;
  const micro = plan.inputs.gravity === "micro";
  const air = `${plan.inputs.o2Percent.toFixed(1)}% oxygen at ${plan.inputs.pressurePsi.toFixed(1)} psi`;
  switch (e.kind) {
    case "ignition":
      return `The ${itemLabel(e.itemId).toLowerCase()} catches fire. In air with ${air}, the model gives ${materialLabel(e.itemId)} a ${pct(
        risk?.probability
      )} chance of igniting. Closest tests:${cite(plan.evidenceIds)}.`;
    case "no-ignition":
      return `The ${itemLabel(e.itemId).toLowerCase()} does not catch. At ${air} the model gives ${materialLabel(e.itemId)} only a ${pct(
        risk?.probability
      )} chance of igniting. Closest tests:${cite(plan.evidenceIds)}.`;
    case "untested-start":
      return `${MATERIAL_LABEL[risk?.item.material ?? "foam"]} has never been ignition-tested in this dataset. It only appears in smoke studies, where samples were heated but not lit${cite(
        ["same", "same-r"]
      )}. We can't say whether it would burn.`;
    case "spread":
      return `The flame reaches the ${itemLabel(e.itemId).toLowerCase()}. Flames here spread at about ${
        risk?.spreadMmS?.toFixed(1) ?? "?"
      } mm/s (estimate from the nearest test runs). Vent flow pushes the fire downstream faster (illustrative).`;
    case "untested-contact":
      return `The fire reaches the ${itemLabel(e.itemId).toLowerCase()}. ${MATERIAL_LABEL[risk?.item.material ?? "foam"]} was never ignition-tested, so whether it burns is unknown. That is a gap worth testing.`;
    case "smoke-detected":
      return micro
        ? `Smoke reaches the detector at the return vent. Without gravity, smoke doesn't rise to the ceiling; it only moves where the air carries it, so detection depends on airflow${cite(
            ["same", "same-r", "daft"]
          )}.`
        : `Smoke reaches the detector at the return vent${cite(["same", "same-r"])}.`;
    case "alarm":
      return plan.crewResponse ? "The fire alarm sounds and the crew respond." : "The fire alarm sounds, but in this run nobody responds.";
    case "vent-shutdown":
      return micro
        ? `The crew shut down the ventilation. In microgravity, cutting the airflow starves the flame of fresh oxygen${cite(["bass", "bass-ii"])}.`
        : `The crew shut down the ventilation. With ${GRAVITY_LABEL[plan.inputs.gravity].toLowerCase()}, hot gas still rises and pulls in fresh air, so the flame keeps burning.`;
    case "self-extinguish":
      return `With no forced airflow and no buoyancy, the flame can't get fresh oxygen and goes out on its own${cite(["bass", "bass-ii"])}.`;
    case "extinguisher":
      return `The crew use a CO2 extinguisher. FLEX measured how much carbon dioxide it takes to put flames out${cite(["flex"])}.`;
    case "out":
      return "All flames are out.";
    case "burnt-out":
      return `The ${itemLabel(e.itemId).toLowerCase()} has burnt through.`;
  }
}

export function eventTitle(e: FireEvent): string {
  return e.itemId && (e.kind === "spread" || e.kind === "untested-contact" || e.kind === "burnt-out")
    ? `${EVENT_LABEL[e.kind]}: ${itemLabel(e.itemId)}`
    : EVENT_LABEL[e.kind];
}
