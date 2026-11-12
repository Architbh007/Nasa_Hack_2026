"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

type IdIndex = { ids: ReadonlySet<string>; acronym: (id: string) => string };

const Ctx = createContext<IdIndex>({ ids: new Set(), acronym: (id) => id });

/** Known investigation ids, so SI citations like [bass-ii] can link to the Explorer. */
export function InvestigationIdsProvider({
  entries,
  children,
}: {
  entries: ReadonlyArray<{ id: string; acronym: string }>;
  children: ReactNode;
}) {
  const value = useMemo(() => {
    const m = new Map(entries.map((e) => [e.id, e.acronym]));
    return { ids: new Set(m.keys()), acronym: (id: string) => m.get(id) ?? id };
  }, [entries]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useInvestigationIds(): IdIndex {
  return useContext(Ctx);
}
