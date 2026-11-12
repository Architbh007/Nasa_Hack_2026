"use client";

import { useMemo } from "react";
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FuelPhaseBadge, PillarBadges } from "@/components/common/badges";
import { formatFlowRange, formatO2Range, formatPressureRange, shortHardware } from "@/lib/format";
import { HABITAT_LABEL } from "@/lib/constants";
import type { HabitatKey, Investigation } from "@/lib/schema";
import { cn } from "@/lib/utils";

export type InvestigationRow = Investigation & { testCount: number };

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
});

const helper = createColumnHelper<typeof features, InvestigationRow>();

function RelevanceMeter({ score }: { score: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex gap-0.5" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn("h-2 w-2.5 rounded-[2px]", i < score ? "bg-primary" : "bg-primary/15")}
          />
        ))}
      </span>
      <span className="tabular text-xs">{score}/5</span>
    </span>
  );
}

export function InvestigationTable({
  rows,
  habitat,
  compareMode,
  selected,
  onToggleSelect,
  onOpen,
  canSelectMore,
}: {
  rows: InvestigationRow[];
  habitat: HabitatKey | "all";
  compareMode: boolean;
  selected: ReadonlySet<string>;
  onToggleSelect: (id: string) => void;
  onOpen: (id: string) => void;
  canSelectMore: boolean;
}) {
  const columns = useMemo(() => {
    const relevance =
      habitat === "all"
        ? []
        : [
            helper.accessor((r) => r.habitatRelevance[habitat].score, {
              id: "relevance",
              header: `${HABITAT_LABEL[habitat]} relevance`,
              sortFn: "basic",
              cell: (info) => <RelevanceMeter score={info.getValue()} />,
            }),
          ];
    return helper.columns([
      helper.accessor("acronym", {
        header: "Investigation",
        sortFn: "alphanumeric",
        cell: (info) => (
          <span className="flex flex-col">
            <span className="font-medium text-foreground">{info.row.original.acronym}</span>
            <span className="max-w-72 truncate text-xs text-muted-foreground">{info.row.original.name}</span>
          </span>
        ),
      }),
      ...relevance,
      helper.accessor("project", { header: "Project", sortFn: "alphanumeric" }),
      helper.accessor("fuelPhase", {
        header: "Fuel phase",
        sortFn: "alphanumeric",
        cell: (info) => <FuelPhaseBadge phase={info.getValue()} />,
      }),
      helper.accessor((r) => r.hardware.map(shortHardware).join(" · "), {
        id: "hardware",
        header: "Hardware",
        sortFn: "alphanumeric",
        cell: (info) => (
          <span className="block max-w-52 truncate text-xs text-muted-foreground" title={info.row.original.hardware.join(", ")}>
            {info.getValue()}
          </span>
        ),
      }),
      helper.accessor((r) => r.oxygenRange.min, {
        id: "o2",
        header: "O2 range",
        sortFn: "basic",
        cell: (info) => <span className="tabular whitespace-nowrap">{formatO2Range(info.row.original)}</span>,
      }),
      helper.accessor((r) => r.pressureRange.minPsi, {
        id: "pressure",
        header: "Pressure",
        sortFn: "basic",
        cell: (info) => <span className="tabular whitespace-nowrap">{formatPressureRange(info.row.original)}</span>,
      }),
      helper.accessor((r) => r.flowRange?.max ?? -1, {
        id: "flow",
        header: "Flow",
        sortFn: "basic",
        cell: (info) => <span className="tabular whitespace-nowrap text-xs">{formatFlowRange(info.row.original)}</span>,
      }),
      helper.accessor((r) => r.safetyPillars.join(","), {
        id: "pillars",
        header: "Pillars",
        enableSorting: false,
        cell: (info) => <PillarBadges pillars={info.row.original.safetyPillars} compact />,
      }),
      helper.accessor("testCount", {
        header: "Tests",
        sortFn: "basic",
        cell: (info) => <span className="tabular">{info.getValue()}</span>,
      }),
    ]);
  }, [habitat]);

  const table = useTable({ features, columns, data: rows });

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card/70">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className="hover:bg-transparent">
              {compareMode && <TableHead className="w-10"><span className="sr-only">Select</span></TableHead>}
              {group.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                const canSort = header.column.getCanSort();
                return (
                  <TableHead key={header.id} className="whitespace-nowrap text-xs">
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        <table.FlexRender header={header} />
                        {sorted === "asc" ? (
                          <ArrowUp className="size-3" aria-label="sorted ascending" />
                        ) : sorted === "desc" ? (
                          <ArrowDown className="size-3" aria-label="sorted descending" />
                        ) : (
                          <ArrowUpDown className="size-3 opacity-40" aria-hidden />
                        )}
                      </button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => {
            const id = row.original.id;
            const isSelected = selected.has(id);
            return (
              <TableRow
                key={row.id}
                data-state={isSelected ? "selected" : undefined}
                className="cursor-pointer"
                onClick={() => (compareMode ? (isSelected || canSelectMore) && onToggleSelect(id) : onOpen(id))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (compareMode) {
                      if (isSelected || canSelectMore) onToggleSelect(id);
                    } else onOpen(id);
                  }
                }}
                tabIndex={0}
                aria-label={compareMode ? `Select ${row.original.acronym} for comparison` : `Open ${row.original.acronym}`}
              >
                {compareMode && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--primary)]"
                      checked={isSelected}
                      disabled={!isSelected && !canSelectMore}
                      onChange={() => onToggleSelect(id)}
                      aria-label={`Select ${row.original.acronym}`}
                    />
                  </TableCell>
                )}
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id} className="py-2.5">
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={12} className="py-10 text-center text-sm text-muted-foreground">
                No investigations match these filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
