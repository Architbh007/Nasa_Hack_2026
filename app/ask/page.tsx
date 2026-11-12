import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { AskView } from "@/components/ask/ask-view";

export const metadata: Metadata = { title: "Ask the Data" };

export default function AskPage() {
  return (
    <>
      <PageHeader
        eyebrow="Q&A"
        title="Ask the Data"
        description="Grounded answers over the investigation records. Each question retrieves the six most relevant records with their aggregate test statistics; the SI answers only from those and cites them by id."
      />
      <AskView />
    </>
  );
}
