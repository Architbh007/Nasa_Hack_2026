"use client";

import type { ReactNode } from "react";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AIRFLOW_LABEL,
  GRAVITY_LABEL,
  MATERIAL_LABEL,
  O2_SLIDER,
  PRESSURE_SLIDER,
  PSI_TO_KPA,
} from "@/lib/constants";
import type { HabitatInputs } from "@/lib/habitat";
import {
  AirflowSchema,
  HabitatGravitySchema,
  MATERIAL_CLASSES,
  type Airflow,
  type HabitatGravity,
  type MaterialClass,
  type Scenario,
} from "@/lib/schema";
import { cn } from "@/lib/utils";

const AIRFLOW_SHORT: Record<Airflow, string> = { quiescent: "Quiescent", low: "Low", ventilated: "Ventilated" };

function Field({ label, value, children }: { label: string; value?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        {value && <span className="tabular text-sm text-foreground">{value}</span>}
      </div>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  render,
  columns = 2,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  render: (v: T) => string;
  columns?: 2 | 3;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("grid gap-1 rounded-lg border border-border bg-background/40 p-1", columns === 3 ? "grid-cols-3" : "grid-cols-2")}
    >
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          onClick={() => onChange(o)}
          className={cn(
            "rounded-md px-2 py-1.5 text-xs transition-colors",
            value === o ? "bg-secondary text-foreground shadow-sm ring-1 ring-primary/40" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {render(o)}
        </button>
      ))}
    </div>
  );
}

export function HabitatControls({
  inputs,
  scenarios,
  presetId,
  onPreset,
  onChange,
}: {
  inputs: HabitatInputs;
  scenarios: readonly Scenario[];
  presetId: string;
  onPreset: (id: string) => void;
  onChange: (next: HabitatInputs) => void;
}) {
  const set = <K extends keyof HabitatInputs>(k: K, v: HabitatInputs[K]) => onChange({ ...inputs, [k]: v });
  return (
    <Card className="h-fit xl:sticky xl:top-12">
      <CardHeader>
        <CardTitle className="text-base">Cabin condition</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <Field label="Scenario preset">
          <Select value={presetId} onValueChange={onPreset}>
            <SelectTrigger className="w-full" aria-label="Scenario preset">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {scenarios.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label} · {s.o2Percent}% at {s.pressurePsi} psi
                </SelectItem>
              ))}
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Oxygen" value={`${inputs.o2Percent.toFixed(1)}%`}>
          <Slider
            min={O2_SLIDER.min}
            max={O2_SLIDER.max}
            step={O2_SLIDER.step}
            value={[inputs.o2Percent]}
            onValueChange={(v) => set("o2Percent", v[0] ?? inputs.o2Percent)}
            aria-label="Oxygen concentration percent"
          />
        </Field>

        <Field
          label="Total pressure"
          value={
            <>
              {inputs.pressurePsi.toFixed(1)} psi{" "}
              <span className="text-muted-foreground">({(inputs.pressurePsi * PSI_TO_KPA).toFixed(0)} kPa)</span>
            </>
          }
        >
          <Slider
            min={PRESSURE_SLIDER.min}
            max={PRESSURE_SLIDER.max}
            step={PRESSURE_SLIDER.step}
            value={[inputs.pressurePsi]}
            onValueChange={(v) => set("pressurePsi", v[0] ?? inputs.pressurePsi)}
            aria-label="Total cabin pressure in psi"
          />
        </Field>

        <Field label="Material class">
          <Select value={inputs.materialClass} onValueChange={(v) => set("materialClass", v as MaterialClass)}>
            <SelectTrigger className="w-full" aria-label="Material class">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MATERIAL_CLASSES.map((m) => (
                <SelectItem key={m} value={m}>
                  {MATERIAL_LABEL[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Airflow" value={<span className="text-xs text-muted-foreground">{AIRFLOW_LABEL[inputs.airflow]}</span>}>
          <Segmented<Airflow>
            label="Airflow"
            columns={3}
            options={AirflowSchema.options}
            value={inputs.airflow}
            onChange={(v) => set("airflow", v)}
            render={(v) => AIRFLOW_SHORT[v]}
          />
        </Field>

        <Field label="Gravity">
          <Segmented<HabitatGravity>
            label="Gravity"
            options={HabitatGravitySchema.options}
            value={inputs.gravity}
            onChange={(v) => set("gravity", v)}
            render={(v) => GRAVITY_LABEL[v]}
          />
        </Field>
      </CardContent>
    </Card>
  );
}
