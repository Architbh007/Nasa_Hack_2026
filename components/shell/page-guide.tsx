import { ArrowDown } from "lucide-react";

export type GuideItem = {
  /** Section name as it appears on the page. */
  title: string;
  /** One or two sentences: what the section does and what you get from it. */
  does: string;
  /** Anchor id of the section, when it can be jumped to. */
  anchor?: string;
};

/**
 * "On this page": a short debrief of every section on a page, shown under the page title,
 * so a visitor knows what each part does before scrolling through it.
 */
export function PageGuide({ question, items }: { question: string; items: readonly GuideItem[] }) {
  return (
    <section aria-labelledby="page-guide" className="mb-16">
      <div className="mb-8 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <h2 id="page-guide" className="text-[1.5rem] leading-tight sm:text-[1.75rem]">
          On this page
        </h2>
        <p className="text-[1.0625rem] text-foreground/70">
          This page answers: <span className="text-foreground">{question}</span>
        </p>
      </div>
      <ol className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(15rem,1fr))]">
        {items.map((item) => {
          const body = (
            <>
              <span className="flex items-center gap-1.5 text-[1.0625rem] font-semibold leading-snug">
                {item.title}
                {item.anchor && (
                  <ArrowDown
                    className="size-4 text-link opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
                    aria-hidden
                  />
                )}
              </span>
              <span className="mt-2 block text-[0.9375rem] leading-relaxed text-foreground/70">{item.does}</span>
            </>
          );
          return (
            <li key={item.title} className="border-t border-white/10 pt-4">
              {item.anchor ? (
                <a href={`#${item.anchor}`} className="group block hover:[&>span:first-child]:text-link">
                  {body}
                </a>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
