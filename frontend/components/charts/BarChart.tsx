"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

interface BarConfig {
  key: string;
  label: string;
  color: string;
}

interface BarChartProps {
  data: Record<string, unknown>[];
  bars: BarConfig[];
  xKey: string;
  title?: string;
  height?: number;
  loading?: boolean;
  className?: string;
  unit?: string;
}

export default function BarChart({
  data,
  bars,
  xKey,
  title,
  height = 240,
  loading = false,
  className,
  unit,
}: BarChartProps) {
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
          No data available for the selected period
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl bg-surface border border-border p-5", className)}>
      {title && <p className="text-sm font-semibold text-app-text mb-4">{title}</p>}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data} margin={{ top: 8, right: 12, left: -4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#D9E3E7" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: "#617580" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#617580" }}
            axisLine={false}
            tickLine={false}
            unit={unit ? ` ${unit}` : undefined}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #D9E3E7",
              fontSize: 12,
              color: "#20323D",
              backgroundColor: "#FFFFFF",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            }}
            formatter={(val: any) => [
              typeof val === "number" ? `${val.toFixed(2)}${unit ? ` ${unit}` : ""}` : val,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#617580", paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
          />
          {bars.map((bar) => (
            <Bar
              key={bar.key}
              dataKey={bar.key}
              name={bar.label}
              fill={bar.color}
              radius={[4, 4, 0, 0]}
              maxBarSize={48}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
