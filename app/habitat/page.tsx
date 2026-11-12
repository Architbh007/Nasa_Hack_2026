import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "Habitat Flammability Explorer" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Main feature" title="Habitat Flammability Explorer" description="Place a proposed cabin atmosphere against tested microgravity combustion conditions." />
      <ComingSoon phase={4} />
    </>
  );
}
