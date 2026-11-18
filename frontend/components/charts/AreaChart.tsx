"use client";

import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

interface AreaConfig {
  key: string;
  label: string;
  color: string;
  fillOpacity?: number;
}

interface AreaChartProps {
  data: Record<string, unknown>[];
  areas: AreaConfig[];
  xKey: string;
  title?: string;
  height?: number;
  loading?: boolean;
  className?: string;
}

export default function AreaChart({
  data,
  areas,
  xKey,
  title,
  height = 240,
  loading = false,
  className,
}: AreaChartProps) {
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

  return (
    <div className={cn("rounded-xl bg-surface border border-border p-5", className)}>
      {title && <p className="text-sm font-semibold text-app-text mb-4">{title}</p>}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsAreaChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
          <defs>
            {areas.map((a) => (
              <linearGradient key={a.key} id={`grad-${a.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={a.color} stopOpacity={0.15} />
                <stop offset="95%" stopColor={a.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
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
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #D9E3E7",
              fontSize: 12,
              color: "#20323D",
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#617580", paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
          />
          {areas.map((area) => (
            <Area
              key={area.key}
              type="monotone"
              dataKey={area.key}
              name={area.label}
              stroke={area.color}
              strokeWidth={2}
              fill={`url(#grad-${area.key})`}
              dot={false}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
