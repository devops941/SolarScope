"use client";

import { useMemo, useState, useEffect } from "react";

interface SunArcStripProps {
  currentHour?: number; // float 0..24
  peakIrradiance?: number; // W/m2
  sunriseHour?: number;
  sunsetHour?: number;
}

export default function SunArcStrip({
  currentHour,
  peakIrradiance = 850,
  sunriseHour = 6.0,
  sunsetHour = 18.5,
}: SunArcStripProps) {
  // If not provided, get local time hour float
  const [nowHour, setNowHour] = useState(13.25);

  useEffect(() => {
    if (currentHour === undefined) {
      const now = new Date();
      setNowHour(now.getHours() + now.getMinutes() / 60);
    } else {
      setNowHour(currentHour);
    }
  }, [currentHour]);

  // Dimensions
  const width = 800;
  const height = 72;
  const r = 320;
  const cx = width / 2;
  const cy = height + 250; // arc crests near y=12

  // Calculate sun position along diurnal path
  const sunPos = useMemo(() => {
    // Clamped between sunrise and sunset
    const clampedH = Math.max(sunriseHour, Math.min(nowHour, sunsetHour));
    const dayFraction = (clampedH - sunriseHour) / (sunsetHour - sunriseHour); // 0 to 1

    // Angle: from pi (left / sunrise) to 0 (right / sunset)
    const angle = Math.PI * (1 - dayFraction);
    const x = cx + r * Math.cos(angle);
    const y = cy - r * Math.sin(angle);

    const isDaylight = nowHour >= sunriseHour && nowHour <= sunsetHour;
    return { x, y, isDaylight, dayFraction };
  }, [nowHour, sunriseHour, sunsetHour, cx, cy, r]);

  return (
    <div className="hidden sm:block w-full border-b border-rule bg-paper px-6 py-1 select-none overflow-hidden">
      <div className="max-w-[1360px] mx-auto flex items-center justify-between">
        {/* Left Solar Ephemeris Data */}
        <div className="flex items-center gap-4 text-[11px] font-mono text-muted tracking-tight">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-sun inline-block" />
            <span className="uppercase font-semibold">DIURNAL ARC:</span>
            <span>06:00 SR → 18:30 SS</span>
          </span>
          <span className="hidden lg:inline text-rule">|</span>
          <span className="hidden lg:inline">
            PEAK INSOLATION: <strong className="text-ink font-semibold">{peakIrradiance} W/m²</strong>
          </span>
        </div>

        {/* Center SVG Solar Arc Path */}
        <div className="relative w-[340px] h-[38px] flex items-center justify-center">
          <svg viewBox="0 0 340 38" className="w-full h-full overflow-visible">
            {/* Horizon Baseline */}
            <line x1="10" y1="34" x2="330" y2="34" stroke="#E3E1E6" strokeWidth="1" />

            {/* Sunrise / Sunset Tick Marks */}
            <line x1="30" y1="31" x2="30" y2="37" stroke="#1B1620" strokeWidth="1" />
            <text x="30" y="27" fontSize="8" fontFamily="Azeret Mono" fill="#6B6571" textAnchor="middle">
              06:00
            </text>

            <line x1="310" y1="31" x2="310" y2="37" stroke="#1B1620" strokeWidth="1" />
            <text x="310" y="27" fontSize="8" fontFamily="Azeret Mono" fill="#6B6571" textAnchor="middle">
              18:30
            </text>

            {/* Solar Noon Crest Marker */}
            <line x1="170" y1="6" x2="170" y2="10" stroke="#E3E1E6" strokeWidth="1" />
            <text x="170" y="5" fontSize="7" fontFamily="Azeret Mono" fill="#6B6571" textAnchor="middle">
              SOLAR NOON
            </text>

            {/* Curved Solar Arc (Parabola / Ellipse arc) */}
            <path
              d="M 30,34 Q 170,-10 310,34"
              fill="none"
              stroke="#FBE8F3"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M 30,34 Q 170,-10 310,34"
              fill="none"
              stroke="#F08A00"
              strokeWidth="1"
              strokeDasharray="2,3"
            />

            {/* Dynamic Sun Marker Dot */}
            {(() => {
              // Map dayFraction to curve
              const t = Math.max(0, Math.min(1, (nowHour - sunriseHour) / (sunsetHour - sunriseHour)));
              // Bezier quadratic interpolation for Q (170, -10) from (30,34) to (310,34)
              const p0 = { x: 30, y: 34 };
              const p1 = { x: 170, y: -10 };
              const p2 = { x: 310, y: 34 };
              const bx = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
              const by = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;

              return (
                <g style={{ transition: "all 600ms cubic-bezier(0.16, 1, 0.3, 1)" }}>
                  {/* Subtle pulsing glow */}
                  <circle cx={bx} cy={by} r="7" fill="#F08A00" opacity="0.2" />
                  {/* Main Sun Core */}
                  <circle cx={bx} cy={by} r="3.5" fill="#F08A00" stroke="#FFFFFF" strokeWidth="1.5" />
                </g>
              );
            })()}
          </svg>
        </div>

        {/* Right Time / Timezone Readout */}
        <div className="flex items-center gap-3 text-[11px] font-mono text-muted tracking-tight">
          <span>
            LOCAL AZIMUTH: <strong className="text-ink font-semibold">182.4° S</strong>
          </span>
          <span className="text-rule">|</span>
          <span className="text-magenta-deep font-semibold">
            {nowHour >= sunriseHour && nowHour <= sunsetHour ? "DIURNAL / GENERATING" : "NOCTURNAL / STANDBY"}
          </span>
        </div>
      </div>
    </div>
  );
}
