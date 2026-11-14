"use client";

import { AlertTriangle, Database, RotateCcw, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function SiSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)} aria-busy="true" aria-label="Generating SI output">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className="h-3.5" style={{ width: `${92 - ((i * 17) % 35)}%` }} />
      ))}
    </div>
  );
}

export function SiError({ message, onRetry, compact = false }: { message: string; onRetry?: () => void; compact?: boolean }) {
  if (compact) {
    return (
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-[#ec835a]" aria-hidden />
        <span>
          {message}
          {onRetry && (
            <button type="button" onClick={onRetry} className="ml-1.5 text-link hover:underline">
              Retry
            </button>
          )}
        </span>
      </p>
    );
  }
  return (
    <Alert className="border-[#ec835a]/40 bg-[#ec835a]/10">
      <AlertTriangle className="text-[#ec835a]" aria-hidden />
      <AlertTitle>SI unavailable</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{message}</p>
        {onRetry && (
          <Button size="xs" variant="outline" onClick={onRetry}>
            <RotateCcw /> Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function SiMeta({ cached, model }: { cached: boolean; model: string }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        {cached ? <Database className="size-3" aria-hidden /> : <Sparkles className="size-3" aria-hidden />}
        {cached ? "Cached SI output" : "Fresh SI output"} · {model}
      </span>
      <span>Grounded in the NASA records shown; check cited ids before use.</span>
    </p>
  );
}

export function SiHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-medium">
      <Sparkles className="size-4 text-primary" aria-hidden />
      {children}
    </h3>
  );
}
