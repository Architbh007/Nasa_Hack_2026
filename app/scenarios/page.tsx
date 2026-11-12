import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "Mission Readiness Scorecard" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Scenarios" title="Mission Readiness Scorecard" description="Coverage of prevention, detection and suppression evidence for each habitat preset." />
      <ComingSoon phase={8} />
    </>
  );
}
