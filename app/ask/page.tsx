import type { Metadata } from "next";
import { PageGuide } from "@/components/shell/page-guide";
import { PageHeader } from "@/components/shell/page-header";
import { AskView } from "@/components/ask/ask-view";

export const metadata: Metadata = { title: "Ask the Data" };

export default function AskPage() {
  return (
    <>
      <PageHeader
        title="Ask the Data"
        description="Grounded answers over the investigation records. Each question retrieves the six most relevant records with their aggregate test statistics; the SI answers only from those and cites them by id."
      />
      <PageGuide
        question="Can I get an answer from the NASA records in plain English?"
        items={[
          {
            title: "Starter questions",
            does: "Example questions to try with one click, covering fuels, low-pressure tests, high-oxygen runs and results.",
          },
          {
            title: "Your question",
            does: "Type anything about the investigations. The six most relevant records are found and sent to the SI with their test statistics.",
          },
          {
            title: "The answer",
            does: "Written only from those records, citing each claim by investigation or run, and saying plainly when the data does not cover the question.",
          },
        ]}
      />
      <AskView />
    </>
  );
}
