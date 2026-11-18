"use client";

import { useState } from "react";
import { Info } from "@phosphor-icons/react";

interface HeroNumeralProps {
  label: string;
  value: number | null | undefined;
  unit?: string;
  decimals?: number;
  periodLabel?: string;
  formulaNote?: string;
  suppressionText?: string;
  isEstimated?: boolean;
}

export default function HeroNumeral({
  label,
  value,
  unit = "",
  decimals = 2,
  periodLabel = "Today",
  formulaNote,
  suppressionText,
  isEstimated = false,
}: HeroNumeralProps) {
  const [showFormula, setShowFormula] = useState(false);
  const hasValue = value !== null && value !== undefined && !isNaN(value);

  return (
    <div className="relative flex-1 px-4 py-2 first:pl-0 last:pr-0 border-r last:border-r-0 border-rule select-none">
      {/* Micro-label Header */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-muted">
          {label}
        </span>

        {formulaNote && (
          <button
            onClick={() => setShowFormula(!showFormula)}
            title="Formula definition"
            className="text-muted hover:text-magenta transition"
          >
            <Info size={13} weight="bold" />
          </button>
        )}
      </div>

      {/* Hero Numeral display */}
      <div className="flex items-baseline gap-1.5 my-1">
        {hasValue ? (
          <>
            <span className="font-display text-4xl sm:text-5xl font-bold tracking-tighter text-ink font-mono tabular-nums">
              {value!.toFixed(decimals)}
            </span>
            {unit && (
              <span className="font-mono text-sm font-semibold text-muted tracking-tight">
                {unit}
              </span>
            )}
            {isEstimated && (
              <span className="text-[10px] font-mono text-sun font-semibold">
                [est.]
              </span>
            )}
          </>
        ) : (
          <span className="font-display text-4xl font-bold text-rule">—</span>
        )}
      </div>

      {/* Subtext: Period or Suppression text */}
      <div className="flex items-center justify-between text-[11px] font-sans text-muted">
        <span>{periodLabel}</span>
        {!hasValue && suppressionText && (
          <span className="text-muted italic">{suppressionText}</span>
        )}
      </div>

      {/* Formula Definition Tooltip Popover */}
      {showFormula && formulaNote && (
        <div className="absolute left-0 bottom-full mb-2 z-30 p-2.5 bg-surface border border-ink text-xs font-mono text-ink shadow-lg max-w-xs rounded-[2px]">
          <p className="font-bold text-[10px] uppercase text-magenta mb-1">IEC 61724 Calculation</p>
          <p className="text-[11px] leading-relaxed text-muted">{formulaNote}</p>
        </div>
      )}
    </div>
  );
}
