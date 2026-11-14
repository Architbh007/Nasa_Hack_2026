import type { Metadata } from "next";
import flameSpread from "@/public/images/flame-spread-solid-fuel.jpg";
import { PageGuide } from "@/components/shell/page-guide";
import { PageHeader } from "@/components/shell/page-header";
import { ResponseView } from "@/components/response/response-view";
import {
  consequenceRows,
  extinguishedBreakdown,
  flowMapPoints,
  getResponseCoding,
  joinResponseEvents,
  responseCoverage,
  tallyResponses,
} from "@/lib/crew-response";
import { getDataset } from "@/lib/data";

export const metadata: Metadata = { title: "Crew Response Evidence" };

export default function ResponsePage() {
  const { runs } = getDataset();
  const coding = getResponseCoding();
  const events = joinResponseEvents(coding.events, runs);
  return (
    <>
      <PageHeader
        title="Crew Response Evidence"
        description="When a fire starts on a spacecraft, the first step is to stop the ventilation. This page collects every time a NASA crew turned the airflow down or off, or used a nitrogen jet, on a real flame in orbit, and what the test notes say happened next."
        image={{
          src: flameSpread,
          alt: "A flame spreading along a strip of solid fuel in a low-speed airflow, photographed in microgravity",
          credit: "NASA · 9902618",
        }}
      />
      <PageGuide
        question="When a fire starts in orbit, what actually puts it out?"
        items={[
          {
            title: "What the crew did",
            anchor: "response-tally",
            does: "For each crew action (fans off, fans down, nitrogen jet, fans up), how often the flame went out, partly went out or kept burning.",
          },
          {
            title: "Airflow map",
            anchor: "airflow",
            does: "Solid-fuel runs plotted by oxygen and airflow speed, coloured by result, to show which conditions were actually tested.",
          },
          {
            title: "Every coded action",
            anchor: "actions",
            does: "Each action, one row at a time, with the investigator's exact words, so every count above can be checked.",
          },
          {
            title: "What \"extinguished\" means",
            anchor: "extinguished",
            does: "Splits the flames recorded as extinguished by what the notes say put them out: a crew action, or the fuel running out.",
          },
          {
            title: "Fires left to burn",
            anchor: "consequences",
            does: "Saffire's larger fires, burned with the airflow left on, and how long they burned, as published.",
          },
          {
            title: "How to read this page",
            anchor: "reading",
            does: "What this evidence does not show, and how the notes were coded.",
          },
        ]}
      />
      <ResponseView
        events={events}
        tally={tallyResponses(events)}
        coverage={responseCoverage(events, runs)}
        flowPoints={flowMapPoints(runs)}
        consequences={consequenceRows(runs)}
        extinguished={extinguishedBreakdown(events, runs)}
        codingRules={coding.rules}
        codingSource={coding.sourceFile}
      />
    </>
  );
}
