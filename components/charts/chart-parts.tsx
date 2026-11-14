import type { ReactNode } from "react";
import type { MarkerShape } from "@/lib/chart-colors";
import { cn } from "@/lib/utils";

/** Small SVG marker used in HTML legends so legend keys match chart shapes. */
export function MarkerGlyph({ shape, color, size = 10 }: { shape: MarkerShape; color: string; size?: number }) {
  const s = size;
  const h = s / 2;
  let el: ReactNode;
  switch (shape) {
    case "triangle":
      el = <polygon points={`${h},1 ${s - 1},${s - 1} 1,${s - 1}`} fill={color} />;
      break;
    case "diamond":
      el = <polygon points={`${h},0 ${s},${h} ${h},${s} 0,${h}`} fill={color} />;
      break;
    case "square":
      el = <rect x={1} y={1} width={s - 2} height={s - 2} rx={1} fill={color} />;
      break;
    case "cross":
      el = (
        <path
          d={`M${h - 1.2},1 h2.4 v${h - 2.2} h${h - 2.2} v2.4 h-${h - 2.2} v${h - 2.2} h-2.4 v-${h - 2.2} h-${h - 2.2} v-2.4 h${h - 2.2} z`}
          fill={color}
        />
      );
      break;
    case "wye":
      el = <path d={`M${h},${h} L${h},${s - 0.5} M${h},${h} L1,1.5 M${h},${h} L${s - 1},1.5`} stroke={color} strokeWidth={1.8} fill="none" />;
      break;
    default:
      el = <circle cx={h} cy={h} r={h - 0.5} fill={color} />;
  }
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden className="shrink-0">
      {el}
    </svg>
  );
}

export type LegendItem = { key: string; label: string; color: string; shape?: MarkerShape; line?: boolean; dashed?: boolean };

export function ChartLegend({ items, className }: { items: readonly LegendItem[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground", className)}>
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-1.5">
          {item.line ? (
            <svg width="16" height="8" aria-hidden>
              <line
                x1="0"
                y1="4"
                x2="16"
                y2="4"
                stroke={item.color}
                strokeWidth="2"
                strokeDasharray={item.dashed ? "3 3" : undefined}
              />
            </svg>
          ) : (
            <MarkerGlyph shape={item.shape ?? "circle"} color={item.color} />
          )}
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

export function TooltipCard({ title, rows, footer }: { title: ReactNode; rows: ReadonlyArray<[string, ReactNode]>; footer?: ReactNode }) {
  return (
    <div className="min-w-44 rounded-lg border border-border bg-popover/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <div className="mb-1 font-medium text-foreground">{title}</div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="tabular text-right text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
      {footer && <div className="mt-1.5 border-t border-border pt-1.5 text-muted-foreground">{footer}</div>}
    </div>
  );
}

export function EmptyChart({ message, height = 220 }: { message: string; height?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground"
      style={{ height }}
    >
      <p className="max-w-xs px-4">{message}</p>
    </div>
  );
}
