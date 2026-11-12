import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "Ask the Data" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Q&A" title="Ask the Data" description="Grounded answers over investigation records, with citations." />
      <ComingSoon phase={7} />
    </>
  );
}
