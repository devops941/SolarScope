import { cn } from "@/lib/utils";

const QUALITY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  valid:              { label: "Valid",             color: "text-primary-teal",  bg: "bg-pale-mint" },
  manual:             { label: "Manual",            color: "text-sky-700",       bg: "bg-sky-50" },
  flagged_irradiance: { label: "Irr. Flag",         color: "text-warning",       bg: "bg-orange-50" },
  flagged_temp:       { label: "Temp Flag",         color: "text-warning",       bg: "bg-orange-50" },
  flagged_power:      { label: "Power Flag",        color: "text-warning",       bg: "bg-orange-50" },
  missing:            { label: "Missing",           color: "text-muted",         bg: "bg-canvas" },
  interpolated:       { label: "Interpolated",      color: "text-purple-700",    bg: "bg-purple-50" },
  duplicate_skipped:  { label: "Dup. Skipped",      color: "text-muted",         bg: "bg-canvas" },
  duplicate_replaced: { label: "Dup. Replaced",     color: "text-sky-700",       bg: "bg-sky-50" },
};

const DEFAULT_STYLE = { label: "", color: "text-muted", bg: "bg-canvas" };

interface QualityBadgeProps {
  flags: string[];
  compact?: boolean;
}

export default function QualityBadge({ flags, compact = false }: QualityBadgeProps) {
  if (!flags || flags.length === 0) {
    flags = ["valid"];
  }

  const isFlagged = flags.some(f => f.startsWith("flagged_"));
  const isValid = flags.includes("valid") && !isFlagged;

  if (compact) {
    if (isValid) return (
      <span className="inline-flex items-center gap-1 rounded-full bg-pale-mint px-2 py-0.5 text-xs font-medium text-primary-teal">
        <span className="h-1.5 w-1.5 rounded-full bg-solar-green" /> Valid
      </span>
    );
    if (isFlagged) return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-warning">
        <span className="h-1.5 w-1.5 rounded-full bg-warning" /> Flagged
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2 py-0.5 text-xs font-medium text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-muted" /> {flags[0]}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {flags.map((f) => {
        const style = QUALITY_LABELS[f] ?? { ...DEFAULT_STYLE, label: f };
        return (
          <span key={f} className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            style.bg, style.color
          )}>
            {style.label || f}
          </span>
        );
      })}
    </div>
  );
}
