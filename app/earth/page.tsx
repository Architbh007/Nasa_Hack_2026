import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "Spinoffs and Earth Applications" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Earth" title="Spinoffs and Earth Applications" description="How microgravity combustion research feeds back into fire safety on Earth." />
      <ComingSoon phase={8} />
    </>
  );
}
