import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { MobileNav } from "@/components/shell/mobile-nav";
import { SyntheticBanner } from "@/components/shell/synthetic-banner";
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
    "SI-powered dashboard that summarizes, ranks and interprets NASA PSI microgravity combustion investigations for crewed habitat fire safety. Prototype on synthetic demo data.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ colorScheme: "dark" }}
    >
      <body className="min-h-full">
        <TooltipProvider delayDuration={150}>
          <SyntheticBanner />
          <div className="flex min-h-[calc(100svh-30px)]">
            <AppSidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <MobileNav />
              <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
                {children}
              </main>
            </div>
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
