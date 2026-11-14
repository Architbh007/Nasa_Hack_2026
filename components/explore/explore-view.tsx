"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GitCompareArrows, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExploreFiltersBar } from "@/components/explore/explore-filters";
import { InvestigationTable, type InvestigationRow } from "@/components/explore/investigation-table";
import { InvestigationSheet } from "@/components/explore/investigation-sheet";
import { CompareDialog } from "@/components/explore/compare-dialog";
import { DEFAULT_FILTERS, MAX_COMPARE, type ExploreFilters } from "@/components/explore/types";
import { createInvestigationIndex } from "@/lib/search";
import type { Investigation, Run, Summary } from "@/lib/schema";

export function ExploreView({
  investigations,
  runs,
  summaries,
}: {
  investigations: Investigation[];
  runs: Run[];
  summaries: Summary[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openId = searchParams.get("id");
  // ?compare=a,b preselects and opens compare mode (handy for demos and SI links).
  const initialCompare = (searchParams.get("compare") ?? "")
    .split(",")
    .filter((id) => investigations.some((i) => i.id === id))
    .slice(0, MAX_COMPARE);

  const [filters, setFilters] = useState<ExploreFilters>(DEFAULT_FILTERS);
  const [compareMode, setCompareMode] = useState(initialCompare.length >= 2);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialCompare));
  const [compareOpen, setCompareOpen] = useState(initialCompare.length >= 2);

  const runsByInvestigation = useMemo(() => {
    const m = new Map<string, Run[]>();
    for (const r of runs) m.set(r.investigationId, [...(m.get(r.investigationId) ?? []), r]);
    return m;
  }, [runs]);

  const index = useMemo(() => createInvestigationIndex(investigations), [investigations]);
  const hardwareOptions = useMemo(
    () => [...new Set(investigations.flatMap((i) => i.hardwareTags))].sort(),
    [investigations]
  );

  const rows: InvestigationRow[] = useMemo(() => {
    const q = filters.query.trim();
    const base = q.length >= 2 ? index.search(q).map((r) => r.item) : investigations;
    return base
      .filter((i) => filters.category === "all" || i.category === filters.category)
      .filter((i) => filters.dataLevel === "all" || i.dataLevel === filters.dataLevel)
      .filter((i) => filters.hardware === "all" || i.hardwareTags.includes(filters.hardware))
      .filter((i) => filters.pillar === "all" || i.teamAssessment.safetyPillars.includes(filters.pillar))
      .filter((i) => {
        if (filters.o2[0] === 0 && filters.o2[1] === 100) return true;
        const o2 = i.ranges.o2Percent;
        return o2 !== null && o2.max >= filters.o2[0] && o2.min <= filters.o2[1];
      });
  }, [filters, index, investigations]);

  const setOpenId = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("id", id);
      else params.delete("id");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_COMPARE) next.add(id);
      return next;
    });

  const openInv = openId ? (investigations.find((i) => i.id === openId) ?? null) : null;
  const selectedInvestigations = investigations.filter((i) => selected.has(i.id));

  return (
    <div className="space-y-4">
      <ExploreFiltersBar
        filters={filters}
        onChange={setFilters}
        hardwareOptions={hardwareOptions}
        resultCount={rows.length}
        totalCount={investigations.length}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={compareMode ? "secondary" : "outline"}
          onClick={() => {
            setCompareMode((v) => !v);
            if (compareMode) setSelected(new Set());
          }}
          aria-pressed={compareMode}
        >
          {compareMode ? <X /> : <GitCompareArrows />}
          {compareMode ? "Exit compare mode" : "Compare mode"}
        </Button>
        {compareMode && (
          <>
            <span className="text-xs text-muted-foreground">
              Select 2 to {MAX_COMPARE} investigations ({selected.size} selected)
            </span>
            <Button disabled={selected.size < 2} onClick={() => setCompareOpen(true)}>
              Compare {selected.size >= 2 ? selected.size : ""}
            </Button>
          </>
        )}
        {!compareMode && (
          <span className="text-xs text-muted-foreground">Click a row for the PSI record, its real runs and an SI summary.</span>
        )}
      </div>

      <InvestigationTable
        rows={rows}
        compareMode={compareMode}
        selected={selected}
        onToggleSelect={toggleSelect}
        onOpen={setOpenId}
        canSelectMore={selected.size < MAX_COMPARE}
      />

      <InvestigationSheet
        inv={openInv}
        runs={openInv ? (runsByInvestigation.get(openInv.id) ?? []) : []}
        summaries={openInv ? summaries.filter((s) => s.investigationId === openInv.id) : []}
        open={openInv !== null}
        onOpenChange={(o) => !o && setOpenId(null)}
      />

      {selectedInvestigations.length >= 2 && (
        <CompareDialog
          open={compareOpen}
          onOpenChange={setCompareOpen}
          investigations={selectedInvestigations}
          runsByInvestigation={runsByInvestigation}
        />
      )}
    </div>
  );
}
