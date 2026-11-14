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
import { CategoryBadge, DataLevelBadge, SourceTag } from "@/components/common/badges";
import { formatO2Range, formatPressureRange, formatYears } from "@/lib/format";
import type { Investigation } from "@/lib/schema";

export type InvestigationRow = Investigation;

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
});

const helper = createColumnHelper<typeof features, InvestigationRow>();

export function InvestigationTable({
  rows,
  compareMode,
  selected,
  onToggleSelect,
  onOpen,
  canSelectMore,
}: {
  rows: InvestigationRow[];
  compareMode: boolean;
  selected: ReadonlySet<string>;
  onToggleSelect: (id: string) => void;
  onOpen: (id: string) => void;
  canSelectMore: boolean;
}) {
  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor("acronym", {
          header: "Investigation",
          sortFn: "alphanumeric",
          cell: (info) => (
            <span className="flex flex-col">
              <span className="flex items-center gap-2 font-medium text-foreground">
                {info.row.original.acronym}
                <SourceTag source={info.row.original.dataSource} />
              </span>
              <span className="max-w-72 truncate text-xs text-muted-foreground">{info.row.original.name}</span>
            </span>
          ),
        }),
        helper.accessor((r) => r.accession ?? "", {
          id: "accession",
          header: "PSI",
          sortFn: "alphanumeric",
          cell: (info) => <span className="tabular whitespace-nowrap text-xs text-muted-foreground">{info.getValue() || "–"}</span>,
        }),
        helper.accessor("category", {
          header: "Category",
          sortFn: "alphanumeric",
          cell: (info) => <CategoryBadge category={info.getValue()} />,
        }),
        helper.accessor("dataLevel", {
          header: "Data held",
          sortFn: "alphanumeric",
          cell: (info) => <DataLevelBadge level={info.getValue()} />,
        }),
        helper.accessor((r) => r.hardwareTags.join(" · "), {
          id: "hardware",
          header: "Hardware",
          sortFn: "alphanumeric",
          cell: (info) => (
            <span className="block max-w-52 truncate text-xs text-muted-foreground" title={info.row.original.hardware.map((h) => h.name).join(", ")}>
              {info.getValue() || "–"}
            </span>
          ),
        }),
        helper.accessor((r) => formatYears(r), {
          id: "years",
          header: "Years (PSI)",
          sortFn: "alphanumeric",
          cell: (info) => <span className="tabular whitespace-nowrap text-xs">{info.getValue()}</span>,
        }),
        helper.accessor((r) => r.ranges.o2Percent?.min ?? -1, {
          id: "o2",
          header: "O2 (runs)",
          sortFn: "basic",
          cell: (info) => <span className="tabular whitespace-nowrap">{formatO2Range(info.row.original)}</span>,
        }),
        helper.accessor((r) => r.ranges.pressurePsi?.min ?? -1, {
          id: "pressure",
          header: "Pressure (runs)",
          sortFn: "basic",
          cell: (info) => <span className="tabular whitespace-nowrap">{formatPressureRange(info.row.original)}</span>,
        }),
        helper.accessor("runCount", {
          header: "Runs",
          sortFn: "basic",
          cell: (info) => <span className="tabular">{info.getValue()}</span>,
        }),
      ]),
    []
  );

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
      <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
        O2 and pressure come from run-level tests only. * Includes runs whose pressure is not recorded, placed at the cited ISS nominal 14.7 psi.
      </p>
    </div>
  );
}
