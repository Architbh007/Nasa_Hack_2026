import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { MobileNav } from "@/components/shell/mobile-nav";
import { DataBanner } from "@/components/shell/data-banner";
import { Starfield } from "@/components/shell/starfield";
import { InvestigationIdsProvider } from "@/components/si/investigation-ids";
import { getDataset } from "@/lib/data";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ colorScheme: "dark" }}
    >
      <body className="min-h-full">
        <Starfield />
        <InvestigationIdsProvider entries={ids}>
          <TooltipProvider delayDuration={150}>
            <DataBanner />
            <div className="flex min-h-[calc(100svh-30px)]">
              <AppSidebar status={status} />
              <div className="flex min-w-0 flex-1 flex-col">
                <MobileNav />
                <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
                  {children}
                </main>
              </div>
            </div>
          </TooltipProvider>
        </InvestigationIdsProvider>
      </body>
    </html>
  );
}
