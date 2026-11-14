import type { Metadata } from "next";
import { DM_Mono, Public_Sans } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DataBanner } from "@/components/shell/data-banner";
import { SpaceBackdrop } from "@/components/shell/space-backdrop";
import { SiteFooter } from "@/components/shell/site-footer";
import { SiteHeader } from "@/components/shell/site-header";
import { InvestigationIdsProvider } from "@/components/si/investigation-ids";
import { getDataset } from "@/lib/data";
import "./globals.css";

// Public Sans for reading text; DM Mono for telemetry labels, run ids and the clock.
const bodySans = Public_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const dataMono = DM_Mono({
  variable: "--font-dm-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "FireSight | Habitat fire safety insights",
    template: "%s | FireSight",
  },
  description:
    "SI-powered dashboard over real NASA PSI microgravity combustion data: which cabin atmospheres real tests cover, which they do not, and where the next experiment should go.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const { investigations, runs } = getDataset();
  const ids = investigations.map((i) => ({ id: i.id, acronym: i.acronym }));
  const status = { investigations: investigations.length, runs: runs.length };
  return (
    <html lang="en" className={`${bodySans.variable} ${dataMono.variable} dark h-full antialiased`} style={{ colorScheme: "dark" }}>
      <body className="flex min-h-full flex-col">
        <SpaceBackdrop />
        <InvestigationIdsProvider entries={ids}>
          <TooltipProvider delayDuration={150}>
            <DataBanner status={status} />
            <SiteHeader />
            <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-10 sm:px-6 lg:px-8">{children}</main>
            <SiteFooter status={status} />
          </TooltipProvider>
        </InvestigationIdsProvider>
      </body>
    </html>
  );
}
