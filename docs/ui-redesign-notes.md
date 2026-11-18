# SolarScope UI Redesign Notes — "Perihelion Edge"

## 1. Executive Summary & Concept
* **Aesthetic Identity:** "Printed Solar Almanac Meets Precision Scientific Instrument"
* **Signature Tokens:** Magenta ink on cool paper (`#C0127A` on `#F7F7F9`), warm solar accents (`#F08A00`), hairline rules (`#E3E1E6`), and sharp 2px precision radius.
* **Key Visual Elements:**
  1. **Right-Edge Spine Tabs:** 44px fixed right rail with rotated typography and alert counts.
  2. **Sentence Ribbon:** Left-aligned contextual sentence (`Showing [Workspace ▾] · [Site ▾] › [System ▾] · [Date ▾]`).
  3. **Sun-Arc Strip:** Half-circle geometric solar arc calculating diurnal azimuth and solar elevation.
  4. **Left Gutter Index Numerals:** Full-width structural bands indexed by bold Unbounded numerals (`01`, `02`, `03`...).

---

## 2. Feature-to-Page Checklist (Requirement §0.3)

| # | Feature / Capability | Route / Surface | Status in Redesign |
|---|---|---|---|
| 1 | Horizon Login & Auth Session | `/login`, `/register` | Mapped to Horizon layout with diurnal solar horizon arc |
| 2 | Almanac Overview | `/dashboard` | 4 structural bands: Numbers, Generation/Irradiance, Signals, Coverage |
| 3 | Sites Directory | `/sites` | Strip directory list with inline expanding site creator |
| 4 | Site Detail Profile | `/sites/[siteId]` | Profile spec plate, systems band, coverage band |
| 5 | Systems & System Detail | `/systems/[systemId]` | Spec plate table (DC kWp, AC kW, Tilt, Azimuth, Coeff) + inline audit |
| 6 | Ingestion Timeline & Rail | `/imports` | Vertical chronological rail with 9-dot lifecycle tracker |
| 7 | 8-Step Ladder Import Wizard | `/imports/new` | Vertical pinned ladder stepper + persistent 20-row live preview |
| 8 | Heat-Calendar & Dense Readings | `/readings` | Top mini heat-calendar + dense Azeret Mono table + inline inspector |
| 9 | Period A vs Period B Analytics | `/analytics` | Dual-bracket comparison pickers, delta indicators, correlation toggle |
| 10 | Daily Alerts Ledger | `/alerts` | Chronological date ledger, Phosphor glyphs, inline Acknowledge/Resolve |
| 11 | Dispatch Ledger Reports | `/reports` | Format selector chips, generated ledger table, inline PDF expander |
| 12 | Team & Workspace Settings | `/team` / `/settings` | 2-column form sheet, role delegation, timezone and audit configuration |
| 13 | Global Context Synchronization | Shared Ribbon | Synchronizes Workspace, Site, System, and Date range across URL params |
| 14 | Template & Sample CSV Downloads | Header & Wizard | Direct streams for blank template and 30-day clean CSVs |
| 15 | Atomic Batch Rollback | Imports & History | Reverses all readings associated with an import batch |

---

## 3. Shared Component Inventory (§5)

| Target Component | Purpose & Signature Behavior |
|---|---|
| `SpineNav` | Fixed 44px right-edge vertical tab bar with 90° rotated labels, active magenta fill, alert count pill |
| `SentenceRibbon` | One-sentence global context bar with popovers modifying URL query parameters |
| `SunArcStrip` | 72px SVG half-circle arc with dynamic sun-position dot and sunrise/sunset ticks |
| `BandSection` | Structural band container introduced by left-gutter Unbounded numerals (`01`, `02`...) and hairline rule |
| `HeroNumeral` | 56–72px Unbounded numeral with unit, formula tooltip, and prerequisite suppression note |
| `FormulaTooltip` | Precision hover trigger revealing mathematical formula breakdown and IEC standard reference |
| `DefinitionList` | Two-column spec plate metadata list |
| `SpecPlateTable` | Dense table with big right-aligned tabular numerals and 1px hairline borders |
| `DirectoryRow` | Wide strip row for solar sites with hover actions (Edit / Archive / Open) |
| `InlineExpandRow` | Table row expanding inline beneath itself without modals or slide-over sheets |
| `TickerList` | One-line-per-item signal stream for alerts with severity glyphs and timestamp |
| `CoverageCalendarStrip` | Vertical bar ticker per day visualizing data completeness percentage |
| `HeatCalendar` | Days × hour blocks coloured by data presence that filter readings on click |
| `LadderStepper` | Pinned vertical 8-step ladder for the CSV import pipeline |
| `DropzoneRect` | Sharp 2px border container with Phosphor sun icon and mono typography |
| `PreviewStrip` | Persistent 20-row preview with inferred types and syntax highlighting |
| `StatusPill` | 999px rounded pill badge with Phosphor icon and status text |
| `LedgerTable` | High-density audit ledger with hairline borders and tabular alignment |
| `PeriodBracketPicker` | Interactive bracket comparison picker (Period A vs Period B) |

---

## 4. Baseline Build & Test Audit Results

* **TypeScript Compilation:** `node .\node_modules\typescript\bin\tsc --noEmit` $\rightarrow$ **0 Errors (Passed)**
* **Package Dependencies Installed:**
  - `@fontsource/unbounded` (500, 700)
  - `@fontsource/schibsted-grotesk` (400, 500, 600)
  - `@fontsource/azeret-mono` (400, 500)
  - `@phosphor-icons/react` (Light weight)
* **Backend Untouched Verification:** `git diff main -- backend/ docker* .env*` $\rightarrow$ **Completely Empty (Untouched)**
