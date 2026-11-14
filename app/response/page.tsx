import type { Metadata } from "next";
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
        eyebrow="Display 02 · Crew response"
        title="Crew Response Evidence"
        description="When a fire starts on a spacecraft, the first step is to stop the ventilation. This page collects every time a NASA crew turned the airflow down or off, or used a nitrogen jet, on a real flame in orbit, and what the test notes say happened next."
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
