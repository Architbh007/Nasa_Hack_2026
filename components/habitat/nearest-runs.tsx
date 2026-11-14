"use client";

import Link from "next/link";
import { SourceTag } from "@/components/common/badges";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OUTCOME_LABEL } from "@/lib/constants";
import { formatRunFlow, num } from "@/lib/format";
import type { NearRun } from "@/lib/metrics";

const signed = (v: number, unit: string) => `${v >= 0 ? "+" : "−"}${num(Math.abs(v), 1)}${unit}`;

/** The real runs closest to the chosen atmosphere. Neighbours to read, not a prediction. */
export function NearestRuns({ runs, acronym }: { runs: readonly NearRun[]; acronym: (id: string) => string }) {
  if (runs.length === 0) {
    return <p className="text-sm text-muted-foreground">No runs in this category have both O2 and pressure recorded.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Run</TableHead>
            <TableHead>Material</TableHead>
            <TableHead className="text-right">O2</TableHead>
            <TableHead className="text-right">Pressure</TableHead>
            <TableHead>Flow</TableHead>
            <TableHead>Recorded outcome</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((n) => {
            const r = n.run;
            return (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap">
                  <Link href={`/explore?id=${r.investigationId}`} className="text-link hover:underline">
                    {acronym(r.investigationId)}
                  </Link>
                  <span className="block font-mono text-[11px] text-muted-foreground">{r.id}</span>
                  <SourceTag source={r.dataSource} className="mt-1" />
                </TableCell>
                <TableCell className="max-w-[12rem] truncate" title={r.material ?? undefined}>
                  {r.material ?? "Not recorded"}
                </TableCell>
                <TableCell className="tabular text-right">
                  {num(n.o2Percent)}%
                  <span className="block text-[11px] text-muted-foreground">{signed(n.dO2, "")}</span>
                </TableCell>
                <TableCell className="tabular text-right">
                  {num(n.pressurePsi)} psi
                  <span className="block text-[11px] text-muted-foreground">
                    {n.assumedPressure ? "not recorded (ISS nominal)" : signed(n.dPsi, "")}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatRunFlow(r)}</TableCell>
                <TableCell>
                  {OUTCOME_LABEL[r.outcome]}
                  {r.outcomeBasis === "notes-keyword" && <span className="block text-[11px] text-muted-foreground">read from investigator notes</span>}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
