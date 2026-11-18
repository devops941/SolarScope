import { cn } from "@/lib/utils";

type Variant = "success" | "warning" | "danger" | "info" | "muted" | "processing";

const VARIANT_STYLES: Record<Variant, string> = {
  success:    "bg-pale-mint text-primary-teal border-solar-green/20",
  warning:    "bg-orange-50 text-warning border-warning/20",
  danger:     "bg-red-50 text-danger border-danger/20",
  info:       "bg-sky-50 text-sky-700 border-sky-200",
  muted:      "bg-canvas text-muted border-border",
  processing: "bg-purple-50 text-purple-700 border-purple-200",
};

const DOT_STYLES: Record<Variant, string> = {
  success:    "bg-solar-green",
  warning:    "bg-warning",
  danger:     "bg-danger",
  info:       "bg-sky-500",
  muted:      "bg-muted",
  processing: "bg-purple-500",
};

interface StatusBadgeProps {
  label: string;
  variant?: Variant;
  dot?: boolean;
  className?: string;
}

export default function StatusBadge({ label, variant = "muted", dot = false, className }: StatusBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
      VARIANT_STYLES[variant],
      className
    )}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", DOT_STYLES[variant])} />}
      {label}
    </span>
  );
}

/* Helper to map import status → variant */
export function importStatusVariant(status: string): Variant {
  const map: Record<string, Variant> = {
    completed: "success",
    completed_with_warnings: "warning",
    processing: "processing",
    queued: "info",
    failed: "danger",
    validation_failed: "danger",
    rolled_back: "muted",
    awaiting_confirmation: "warning",
    uploaded: "info",
    preview_ready: "info",
  };
  return map[status] ?? "muted";
}

export function alertSeverityVariant(severity: string): Variant {
  const map: Record<string, Variant> = {
    critical: "danger",
    warning: "warning",
    info: "info",
  };
  return map[severity] ?? "muted";
}
