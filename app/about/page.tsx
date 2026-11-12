import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "About and Methods" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="About" title="About and Methods" description="Data policy, generation rules, ranking, similarity and model methods." />
      <ComingSoon phase={8} />
    </>
  );
}
