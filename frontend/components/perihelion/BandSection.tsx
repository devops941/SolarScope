"use client";

import React from "react";

interface BandSectionProps {
  index: string; // "01", "02", "03", etc.
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function BandSection({
  index,
  title,
  description,
  actions,
  children,
  className = "",
}: BandSectionProps) {
  return (
    <section className={`w-full border-t-[3px] border-ink pt-6 mb-10 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Gutter: Big Unbounded Index Numeral & Section Header */}
        <div className="md:col-span-3 pr-4 select-none">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold tracking-tight text-ink">
              {index}
            </span>
            {title && (
              <h2 className="font-sans text-[15px] font-bold text-ink uppercase tracking-wide">
                {title}
              </h2>
            )}
          </div>

          {description && (
            <p className="font-sans text-[13px] text-muted leading-relaxed mt-1.5">
              {description}
            </p>
          )}

          {actions && <div className="mt-4">{actions}</div>}
        </div>

        {/* Right Content Area: Wide Band Body */}
        <div className="md:col-span-9">{children}</div>
      </div>
    </section>
  );
}

export function PageHeaderGutter({
  stackedTitle,
  description,
  rightActions,
}: {
  stackedTitle: string; // e.g. "OVER-VIEW" or "READ-INGS"
  description?: string;
  rightActions?: React.ReactNode;
}) {
  return (
    <div className="w-full pb-8 mb-6 border-b border-rule">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-ink leading-tight">
            {stackedTitle}
          </h1>
          {description && (
            <p className="font-sans text-[13.5px] text-muted mt-1 leading-snug">
              {description}
            </p>
          )}
        </div>

        {rightActions && <div className="flex items-center gap-2.5">{rightActions}</div>}
      </div>
    </div>
  );
}
