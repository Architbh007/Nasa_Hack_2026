"use client";

import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { useInvestigationIds } from "@/components/si/investigation-ids";
import { cn } from "@/lib/utils";
import { linkifyCitations } from "@/lib/citations";

const components: Components = {
  a: ({ href, children }) =>
    href?.startsWith("/") ? (
      <Link href={href} className="rounded bg-link/10 px-1 font-medium text-link no-underline hover:bg-link/20">
        {children}
      </Link>
    ) : (
      <a href={href} target="_blank" rel="noreferrer" className="text-link underline">
        {children}
      </a>
    ),
  p: ({ children }) => <p className="leading-relaxed [&:not(:first-child)]:mt-2">{children}</p>,
  ul: ({ children }) => <ul className="mt-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="mt-2 list-decimal space-y-1 pl-5">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 text-[0.85em]">{children}</code>,
  table: ({ children }) => <table className="mt-2 w-full text-xs">{children}</table>,
  th: ({ children }) => <th className="border-b border-border px-2 py-1 text-left font-medium">{children}</th>,
  td: ({ children }) => <td className="border-b border-border/50 px-2 py-1">{children}</td>,
};

export function SiMarkdown({ text, className }: { text: string; className?: string }) {
  const { ids, acronym } = useInvestigationIds();
  return (
    <div className={cn("text-sm text-foreground/90", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {linkifyCitations(text, ids, acronym)}
      </ReactMarkdown>
    </div>
  );
}
