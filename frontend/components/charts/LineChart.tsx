"use client";

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

interface LineConfig {
  key: string;
  label: string;
  color: string;
  unit?: string;
  yAxisId?: string;
}

interface LineChartProps {
  data: Record<string, unknown>[];
  lines: LineConfig[];
  xKey: string;
  xLabel?: string;
  title?: string;
  height?: number;
  loading?: boolean;
  className?: string;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; unit?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-lg text-xs">
      <p className="font-medium text-app-text mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mt-0.5">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted">{p.name}:</span>
          <span className="font-medium text-app-text">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function LineChart({
  data,
  lines,
  xKey,
  title,
  height = 240,
  loading = false,
  className,
}: LineChartProps) {
  if (loading) {
    return (
      <div className={cn("rounded-xl bg-surface border border-border p-5", className)}>
        {title && <div className="h-5 w-40 bg-canvas rounded animate-pulse mb-4" />}
        <div className="bg-canvas rounded-lg animate-pulse" style={{ height }} />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className={cn("rounded-xl bg-surface border border-border p-5", className)}>
        {title && <p className="text-sm font-semibold text-app-text mb-4">{title}</p>}
        <div
          className="flex items-center justify-center rounded-lg border-2 border-dashed border-border text-sm text-muted"
          style={{ height }}
        >
          No data for selected period
        </div>
      </div>
    );
  }

  const hasMultipleAxes = new Set(lines.map((l) => l.yAxisId ?? "left")).size > 1;

  return (
    <div className={cn("rounded-xl bg-surface border border-border p-5", className)}>
      {title && <p className="text-sm font-semibold text-app-text mb-4">{title}</p>}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#D9E3E7" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: "#617580" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "#617580" }}
            axisLine={false}
            tickLine={false}
          />
          {hasMultipleAxes && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: "#617580" }}
              axisLine={false}
              tickLine={false}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#617580", paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
          />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.label}
              stroke={line.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              yAxisId={line.yAxisId ?? "left"}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}
