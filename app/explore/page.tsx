import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "Investigation Explorer" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Explore" title="Investigation Explorer" description="Filter, inspect and compare PSI combustion investigations and their test runs." />
      <ComingSoon phase={3} />
    </>
  );
}
