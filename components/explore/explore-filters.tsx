"use client";

import { RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FUEL_PHASE_LABEL,
  HABITAT_LABEL,
  PILLAR_LABEL,
} from "@/lib/constants";
import { FUEL_PHASES, HABITAT_KEYS, SAFETY_PILLARS, type FuelPhase, type HabitatKey, type SafetyPillar } from "@/lib/schema";
import { DEFAULT_FILTERS, type ExploreFilters } from "./types";

function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T | "all";
  onChange: (v: T | "all") => void;
  options: ReadonlyArray<{ value: T; label: string }>;
}) {
  return (
    <label className="flex min-w-36 flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      {label}
      <Select value={value} onValueChange={(v) => onChange(v as T | "all")}>
        <SelectTrigger className="w-full normal-case tracking-normal" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

export function ExploreFiltersBar({
  filters,
  onChange,
  hardwareOptions,
  resultCount,
  totalCount,
}: {
  filters: ExploreFilters;
  onChange: (next: ExploreFilters) => void;
  hardwareOptions: readonly string[];
  resultCount: number;
  totalCount: number;
}) {
  const set = <K extends keyof ExploreFilters>(key: K, value: ExploreFilters[K]) =>
    onChange({ ...filters, [key]: value });
  const dirty = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card/70 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-56 flex-1 flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Search
          <span className="relative normal-case tracking-normal">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={filters.query}
              onChange={(e) => set("query", e.target.value)}
              placeholder="Name, fuel, instrument, finding…"
              className="pl-8"
              aria-label="Search investigations"
            />
          </span>
        </label>
        <FilterSelect<FuelPhase>
          label="Fuel phase"
          value={filters.fuelPhase}
          onChange={(v) => set("fuelPhase", v)}
          options={FUEL_PHASES.map((p) => ({ value: p, label: FUEL_PHASE_LABEL[p] }))}
        />
        <FilterSelect<string>
          label="Hardware"
          value={filters.hardware}
          onChange={(v) => set("hardware", v)}
          options={hardwareOptions.map((h) => ({ value: h, label: h }))}
        />
        <FilterSelect<SafetyPillar>
          label="Safety pillar"
          value={filters.pillar}
          onChange={(v) => set("pillar", v)}
          options={SAFETY_PILLARS.map((p) => ({ value: p, label: PILLAR_LABEL[p] }))}
        />
        <FilterSelect<HabitatKey>
          label="Habitat"
          value={filters.habitat}
          onChange={(v) => set("habitat", v)}
          options={HABITAT_KEYS.map((h) => ({ value: h, label: `${HABITAT_LABEL[h]} (relevance ≥ 3)` }))}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex min-w-64 flex-1 items-center gap-3">
          <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Tested O2
          </span>
          <Slider
            min={0}
            max={100}
            step={1}
            value={filters.o2}
            onValueChange={(v) => set("o2", [v[0] ?? 0, v[1] ?? 100])}
            aria-label="Tested oxygen range"
            className="max-w-sm"
          />
          <span className="tabular w-20 shrink-0 text-xs text-foreground">
            {filters.o2[0]}–{filters.o2[1]}%
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          Showing <span className="tabular text-foreground">{resultCount}</span> of {totalCount} investigations
        </span>
        {dirty && (
          <Button variant="ghost" size="sm" onClick={() => onChange(DEFAULT_FILTERS)}>
            <RotateCcw /> Reset filters
          </Button>
        )}
      </div>
    </div>
  );
}
