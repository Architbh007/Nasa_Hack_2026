"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GitCompareArrows, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExploreFiltersBar } from "@/components/explore/explore-filters";
import { InvestigationTable, type InvestigationRow } from "@/components/explore/investigation-table";
import { InvestigationSheet } from "@/components/explore/investigation-sheet";
import { CompareDialog } from "@/components/explore/compare-dialog";
import { ThenVsNow } from "@/components/explore/then-vs-now";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_FILTERS, HABITAT_MIN_SCORE, MAX_COMPARE, type ExploreFilters } from "@/components/explore/types";
import { createInvestigationIndex } from "@/lib/search";
import type { Investigation, TestRun } from "@/lib/schema";

export function ExploreView({
  investigations,
  tests,
}: {
  investigations: Investigation[];
  tests: TestRun[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openId = searchParams.get("id");
  const tab = searchParams.get("tab") === "history" ? "history" : "table";
  // ?compare=a,b preselects and opens compare mode (handy for demos and SI links).
  const initialCompare = (searchParams.get("compare") ?? "")
    .split(",")
    .filter((id) => investigations.some((i) => i.id === id))
    .slice(0, MAX_COMPARE);

  const [filters, setFilters] = useState<ExploreFilters>(DEFAULT_FILTERS);
  const [compareMode, setCompareMode] = useState(initialCompare.length >= 2);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialCompare));
  const [compareOpen, setCompareOpen] = useState(initialCompare.length >= 2);

  const testsByInvestigation = useMemo(() => {
    const m = new Map<string, TestRun[]>();
    for (const t of tests) {
      const arr = m.get(t.investigationId) ?? [];
      arr.push(t);
      m.set(t.investigationId, arr);
    }
    return m;
  }, [tests]);

  const index = useMemo(() => createInvestigationIndex(investigations), [investigations]);
  const hardwareOptions = useMemo(
    () => [...new Set(investigations.flatMap((i) => i.hardware))].sort(),
    [investigations]
  );

  const rows: InvestigationRow[] = useMemo(() => {
    const q = filters.query.trim();
    const base = q.length >= 2 ? index.search(q).map((r) => r.item) : investigations;
    return base
      .filter((i) => filters.fuelPhase === "all" || i.fuelPhase === filters.fuelPhase)
      .filter((i) => filters.hardware === "all" || i.hardware.includes(filters.hardware))
      .filter((i) => filters.pillar === "all" || i.safetyPillars.includes(filters.pillar))
      .filter((i) => filters.habitat === "all" || i.habitatRelevance[filters.habitat].score >= HABITAT_MIN_SCORE)
      .filter((i) => i.oxygenRange.max >= filters.o2[0] && i.oxygenRange.min <= filters.o2[1])
      .map((i) => ({ ...i, testCount: testsByInvestigation.get(i.id)?.length ?? 0 }));
  }, [filters, index, investigations, testsByInvestigation]);

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

  const setTab = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "history") params.set("tab", "history");
      else params.delete("tab");
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
    <Tabs value={tab} onValueChange={setTab} className="gap-4">
      <TabsList>
        <TabsTrigger value="table">Investigations</TabsTrigger>
        <TabsTrigger value="history">Then vs Now</TabsTrigger>
      </TabsList>

      <TabsContent value="history">
        <ThenVsNow investigations={investigations} onOpen={setOpenId} />
      </TabsContent>

      <TabsContent value="table" className="space-y-4">
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
            <span className="text-xs text-muted-foreground">Click a row for the full record, test runs and SI summary.</span>
          )}
        </div>

        <InvestigationTable
          rows={rows}
          habitat={filters.habitat}
          compareMode={compareMode}
          selected={selected}
          onToggleSelect={toggleSelect}
          onOpen={setOpenId}
          canSelectMore={selected.size < MAX_COMPARE}
        />
      </TabsContent>

      <InvestigationSheet
        inv={openInv}
        tests={openInv ? (testsByInvestigation.get(openInv.id) ?? []) : []}
        open={openInv !== null}
        onOpenChange={(o) => !o && setOpenId(null)}
      />

      {selectedInvestigations.length >= 2 && (
        <CompareDialog
          open={compareOpen}
          onOpenChange={setCompareOpen}
          investigations={selectedInvestigations}
          testsByInvestigation={testsByInvestigation}
        />
      )}
    </Tabs>
  );
}
