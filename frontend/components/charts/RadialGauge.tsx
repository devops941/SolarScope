"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface RadialGaugeProps {
  value: number; // 0 to 100
  maxValue?: number;
  label: string;
  sublabel?: string;
  size?: number;
  strokeWidth?: number;
  unit?: string;
  className?: string;
}

export default function RadialGauge({
  value,
  maxValue = 100,
  label,
  sublabel,
  size = 180,
  strokeWidth = 14,
  unit = "%",
  className,
}: RadialGaugeProps) {
  const clampedValue = Math.min(Math.max(value, 0), maxValue);
  const percentage = (clampedValue / maxValue) * 100;

  // Gauge geometry (240-degree arc)
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  // Use a 240 deg arc instead of full 360 circle for classic gauge look
  const arcLength = (circumference * 240) / 360;
  const strokeDashoffset = arcLength - (arcLength * percentage) / 100;

  // Determine color based on percentage
  const getColor = (pct: number) => {
    if (pct >= 75) return "#10B981"; // Emerald
    if (pct >= 50) return "#F59E0B"; // Amber
    return "#EF4444"; // Crimson
  };

  const strokeColor = getColor(percentage);

  return (
    <div className={cn("flex flex-col items-center justify-center relative", className)}>
      <div className="relative" style={{ width: size, height: size * 0.85 }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-[210deg] overflow-visible"
        >
          {/* Background Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />

          {/* Active Progress Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Text Info */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
          <div className="flex items-baseline">
            <span className="text-3xl font-extrabold tracking-tight text-app-text">
              {clampedValue.toFixed(unit === "%" ? 1 : 2)}
            </span>
            <span className="text-sm font-semibold text-muted ml-0.5">{unit}</span>
          </div>
          <span className="text-xs font-semibold text-muted tracking-wide uppercase mt-0.5">
            {label}
          </span>
        </div>
      </div>

      {sublabel && (
        <span className="text-xs text-muted font-medium mt-1 text-center max-w-[160px]">
          {sublabel}
        </span>
      )}
    </div>
  );
}
