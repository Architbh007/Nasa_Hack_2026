import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "Investigation Network" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Graph" title="Investigation Network" description="Investigations linked by shared hardware, fuels, instruments and variables." />
      <ComingSoon phase={5} />
    </>
  );
}
