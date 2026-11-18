import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number | null;
  unit?: string;
  subtitle?: string;
  trend?: { value: number; label?: string };
  badge?: string;
  badgeVariant?: "success" | "warning" | "danger" | "info";
  loading?: boolean;
  className?: string;
  tooltip?: string;
}

export default function MetricCard({
  title,
  value,
  unit,
  subtitle,
  trend,
  badge,
  badgeVariant = "info",
  loading = false,
  className,
}: MetricCardProps) {
  const badgeColors = {
    success: "bg-pale-mint text-primary-teal",
    warning: "bg-orange-50 text-warning",
    danger: "bg-red-50 text-danger",
    info: "bg-sky-50 text-sky-700",
  };

  if (loading) {
    return (
      <div className={cn("rounded-xl bg-surface border border-border p-5", className)}>
        <div className="h-4 w-24 bg-canvas rounded animate-pulse mb-3" />
        <div className="h-8 w-32 bg-canvas rounded animate-pulse mb-2" />
        <div className="h-3 w-20 bg-canvas rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl bg-surface border border-border p-5 hover:shadow-sm transition-shadow", className)}>
      <div className="flex items-start justify-between mb-1">
        <p className="text-sm font-medium text-muted">{title}</p>
        {badge && (
          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", badgeColors[badgeVariant])}>
            {badge}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 mt-2">
        {value === null ? (
          <span className="text-2xl font-bold text-muted">—</span>
        ) : (
          <span className="text-2xl font-bold text-app-text tracking-tight">{value}</span>
        )}
        {unit && <span className="text-sm font-medium text-muted">{unit}</span>}
      </div>

      <div className="flex items-center gap-2 mt-2">
        {trend !== undefined && (
          <span className={cn(
            "flex items-center gap-0.5 text-xs font-medium",
            trend.value > 0 ? "text-solar-green" : trend.value < 0 ? "text-danger" : "text-muted"
          )}>
            {trend.value > 0 ? <TrendingUp className="h-3 w-3" /> :
             trend.value < 0 ? <TrendingDown className="h-3 w-3" /> :
             <Minus className="h-3 w-3" />}
            {trend.value > 0 ? "+" : ""}{trend.value}%
          </span>
        )}
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}
