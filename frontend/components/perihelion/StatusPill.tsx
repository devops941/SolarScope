"use client";

import React from "react";
import { CheckCircle, Warning, Info, XCircle } from "@phosphor-icons/react";

interface StatusPillProps {
  label: string;
  variant?: "success" | "warning" | "danger" | "info" | "muted";
  icon?: React.ReactNode;
}

export default function StatusPill({ label, variant = "muted", icon }: StatusPillProps) {
  const styles = {
    success: "bg-magenta-wash text-magenta-deep border-magenta/30",
    warning: "bg-amber-50 text-amber-700 border-amber-300",
    danger: "bg-rose-50 text-rose-700 border-rose-300",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    muted: "bg-paper text-muted border-rule",
  };

  const defaultIcons = {
    success: <CheckCircle size={12} weight="bold" className="text-magenta" />,
    warning: <Warning size={12} weight="bold" className="text-amber-600" />,
    danger: <XCircle size={12} weight="bold" className="text-rose-600" />,
    info: <Info size={12} weight="bold" className="text-blue-600" />,
    muted: <span className="h-1.5 w-1.5 rounded-full bg-muted" />,
  };

  return (
    <span
      data-pill="true"
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-sans font-medium uppercase tracking-wider rounded-full border ${styles[variant]}`}
    >
      {icon ?? defaultIcons[variant]}
      <span>{label}</span>
    </span>
  );
}
