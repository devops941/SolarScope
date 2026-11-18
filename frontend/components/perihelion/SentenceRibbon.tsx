"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CaretDown, Check, Copy, ArrowCounterClockwise } from "@phosphor-icons/react";
import { useSites } from "@/features/sites/useSites";
import { useSystemsBySite } from "@/features/systems/useSystems";
import { useAuth } from "@/features/auth/useAuth";

const INTERVALS = ["15m", "30m", "1h", "1d"];
const QUALITIES = [
  { value: "valid", label: "valid readings" },
  { value: "all", label: "all readings" },
  { value: "flagged", label: "flagged only" },
];

export default function SentenceRibbon() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, workspace } = useAuth();

  // URL state
  const siteId = searchParams.get("siteId") || "";
  const systemId = searchParams.get("systemId") || "";
  const startDate = searchParams.get("start") || searchParams.get("from") || "2026-10-01";
  const endDate = searchParams.get("end") || searchParams.get("to") || "2026-10-31";
  const interval = searchParams.get("interval") || "15m";
  const quality = searchParams.get("quality") || "valid";

  // Data queries
  const { data: sitesData } = useSites();
  const sites = sitesData?.items ?? [];
  const { data: systems = [] } = useSystemsBySite(siteId || sites[0]?.id || "");

  // Popover state
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const ribbonRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ribbonRef.current && !ribbonRef.current.contains(e.target as Node)) {
        setActivePopover(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeSite = sites.find((s) => s.id === siteId) || sites[0];
  const activeSystem = systems.find((s) => s.id === systemId) || systems[0];

  // Helper to update query params
  const updateParam = (key: string, val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set(key, val);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
    setActivePopover(null);
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleReset = () => {
    router.push(pathname);
    setActivePopover(null);
  };

  return (
    <div
      ref={ribbonRef}
      className="relative w-full border-b border-rule bg-paper py-2.5 px-4 sm:px-6 text-[13.5px] leading-relaxed text-ink select-none flex flex-wrap items-center gap-y-1.5"
    >
      <span className="text-muted mr-1.5 font-mono text-[11px] uppercase tracking-wider">CONTEXT:</span>
      <span>Showing</span>

      {/* Workspace Bracket */}
      <span className="inline-block mx-1">
        <button
          onClick={() => setActivePopover(activePopover === "ws" ? null : "ws")}
          className="inline-flex items-center gap-0.5 font-medium text-magenta-deep hover:text-magenta border-b border-dashed border-magenta/40 px-1 hover:bg-magenta-wash/50 rounded-[2px]"
        >
          <span>{workspace?.name ? workspace.name : "Chennai Solar Plant"}</span>
          <CaretDown size={11} weight="bold" />
        </button>
      </span>

      <span>·</span>

      {/* Site Bracket */}
      <span className="relative inline-block mx-1">
        <button
          onClick={() => setActivePopover(activePopover === "site" ? null : "site")}
          className="inline-flex items-center gap-0.5 font-medium text-magenta-deep hover:text-magenta border-b border-dashed border-magenta/40 px-1 hover:bg-magenta-wash/50 rounded-[2px]"
        >
          <span>{activeSite ? activeSite.name : "All Sites"}</span>
          <CaretDown size={11} weight="bold" />
        </button>

        {activePopover === "site" && (
          <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[200px] bg-surface border border-rule shadow-md p-1 rounded-[2px]">
            <p className="px-2 py-1 text-[11px] font-mono text-muted uppercase tracking-wider border-b border-rule">
              Select Solar Site
            </p>
            <div className="max-h-48 overflow-y-auto py-1">
              {sites.map((s) => (
                <button
                  key={s.id}
                  onClick={() => updateParam("siteId", s.id)}
                  className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center justify-between rounded-[2px] transition ${
                    s.id === siteId ? "bg-magenta-wash text-magenta-deep font-semibold" : "hover:bg-paper text-ink"
                  }`}
                >
                  <span>{s.name}</span>
                  {s.id === siteId && <Check size={12} weight="bold" className="text-magenta" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </span>

      <span>›</span>

      {/* System Bracket */}
      <span className="relative inline-block mx-1">
        <button
          onClick={() => setActivePopover(activePopover === "system" ? null : "system")}
          className="inline-flex items-center gap-0.5 font-medium text-magenta-deep hover:text-magenta border-b border-dashed border-magenta/40 px-1 hover:bg-magenta-wash/50 rounded-[2px]"
        >
          <span>{activeSystem ? `${activeSystem.name} (${activeSystem.dc_capacity_kwp} kWp)` : "All Systems"}</span>
          <CaretDown size={11} weight="bold" />
        </button>

        {activePopover === "system" && (
          <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[220px] bg-surface border border-rule shadow-md p-1 rounded-[2px]">
            <p className="px-2 py-1 text-[11px] font-mono text-muted uppercase tracking-wider border-b border-rule">
              Select PV Array
            </p>
            <div className="max-h-48 overflow-y-auto py-1">
              {systems.map((sys) => (
                <button
                  key={sys.id}
                  onClick={() => updateParam("systemId", sys.id)}
                  className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center justify-between rounded-[2px] transition ${
                    sys.id === systemId ? "bg-magenta-wash text-magenta-deep font-semibold" : "hover:bg-paper text-ink"
                  }`}
                >
                  <span>{sys.name}</span>
                  {sys.id === systemId && <Check size={12} weight="bold" className="text-magenta" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </span>

      <span>·</span>

      {/* Date Range Bracket */}
      <span className="relative inline-block mx-1">
        <button
          onClick={() => setActivePopover(activePopover === "dates" ? null : "dates")}
          className="inline-flex items-center gap-0.5 font-mono text-xs text-magenta-deep hover:text-magenta border-b border-dashed border-magenta/40 px-1 hover:bg-magenta-wash/50 rounded-[2px]"
        >
          <span>{startDate} – {endDate}</span>
          <CaretDown size={11} weight="bold" />
        </button>

        {activePopover === "dates" && (
          <div className="absolute left-0 top-full mt-1.5 z-50 p-3 bg-surface border border-rule shadow-md rounded-[2px] space-y-2">
            <div>
              <label className="block text-[11px] font-mono text-muted mb-1">From Date</label>
              <input
                type="date"
                defaultValue={startDate}
                onChange={(e) => updateParam("start", e.target.value)}
                className="text-xs font-mono border border-rule px-2 py-1 rounded-[2px] bg-paper"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-muted mb-1">To Date</label>
              <input
                type="date"
                defaultValue={endDate}
                onChange={(e) => updateParam("end", e.target.value)}
                className="text-xs font-mono border border-rule px-2 py-1 rounded-[2px] bg-paper"
              />
            </div>
          </div>
        )}
      </span>

      <span>·</span>
      <span>every</span>

      {/* Interval Bracket */}
      <span className="relative inline-block mx-1">
        <button
          onClick={() => setActivePopover(activePopover === "interval" ? null : "interval")}
          className="inline-flex items-center gap-0.5 font-mono text-xs text-magenta-deep hover:text-magenta border-b border-dashed border-magenta/40 px-1 hover:bg-magenta-wash/50 rounded-[2px]"
        >
          <span>{interval}</span>
          <CaretDown size={11} weight="bold" />
        </button>

        {activePopover === "interval" && (
          <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[120px] bg-surface border border-rule shadow-md p-1 rounded-[2px]">
            {INTERVALS.map((intv) => (
              <button
                key={intv}
                onClick={() => updateParam("interval", intv)}
                className={`w-full text-left px-2.5 py-1 text-xs font-mono rounded-[2px] ${
                  intv === interval ? "bg-magenta-wash text-magenta-deep font-semibold" : "hover:bg-paper"
                }`}
              >
                {intv}
              </button>
            ))}
          </div>
        )}
      </span>

      <span>·</span>

      {/* Quality Bracket */}
      <span className="relative inline-block mx-1">
        <button
          onClick={() => setActivePopover(activePopover === "quality" ? null : "quality")}
          className="inline-flex items-center gap-0.5 font-medium text-magenta-deep hover:text-magenta border-b border-dashed border-magenta/40 px-1 hover:bg-magenta-wash/50 rounded-[2px]"
        >
          <span>{QUALITIES.find((q) => q.value === quality)?.label || quality}</span>
          <CaretDown size={11} weight="bold" />
        </button>

        {activePopover === "quality" && (
          <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[140px] bg-surface border border-rule shadow-md p-1 rounded-[2px]">
            {QUALITIES.map((q) => (
              <button
                key={q.value}
                onClick={() => updateParam("quality", q.value)}
                className={`w-full text-left px-2.5 py-1 text-xs rounded-[2px] ${
                  q.value === quality ? "bg-magenta-wash text-magenta-deep font-semibold" : "hover:bg-paper"
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>
        )}
      </span>

      {/* End Actions: Copy link & Reset */}
      <div className="ml-auto flex items-center gap-3 text-xs pl-4 border-l border-rule">
        <button
          onClick={handleCopyLink}
          className="inline-flex items-center gap-1 text-muted hover:text-ink font-mono"
        >
          <Copy size={12} />
          <span>{copied ? "Copied!" : "copy link"}</span>
        </button>

        <button
          onClick={handleReset}
          className="inline-flex items-center gap-1 text-muted hover:text-magenta font-mono"
        >
          <ArrowCounterClockwise size={12} />
          <span>reset</span>
        </button>
      </div>
    </div>
  );
}
