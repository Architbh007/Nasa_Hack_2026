import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteFooter } from "@/components/shell/site-footer";
import { SiteHeader } from "@/components/shell/site-header";
import { InvestigationIdsProvider } from "@/components/si/investigation-ids";
import { getDataset } from "@/lib/data";
import "./globals.css";

// Geist for everything people read; Geist Mono only for run ids and source references.
// (The mono font keeps the --font-dm-mono variable name that the styles already reference.)
const bodySans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const dataMono = Geist_Mono({
  variable: "--font-dm-mono",
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
        <InvestigationIdsProvider entries={ids}>
          <TooltipProvider delayDuration={150}>
            <SiteHeader />
            <main className="mx-auto w-full max-w-[1280px] flex-1 px-5 pb-24 pt-14 sm:px-8 lg:px-10">{children}</main>
            <SiteFooter status={status} />
          </TooltipProvider>
        </InvestigationIdsProvider>
      </body>
    </html>
  );
}
