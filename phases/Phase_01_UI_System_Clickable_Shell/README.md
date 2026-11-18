# Phase 1 — UI System & Clickable Shell
**Duration:** 1 Week | **Difficulty:** Medium | **Week:** 2

---

## Objectives
Build the full Next.js frontend skeleton — all pages with navigation working but no real API data yet. By end of this phase, you can click through every screen.

---

## Design Tokens (Colors)

```css
--deep-teal:    #123247;  /* Sidebar, header */
--primary-teal: #137C70;  /* Buttons, active nav */
--solar-green:  #2BA784;  /* Positive KPIs, charts */
--pale-mint:    #E4F5EF;  /* Success surfaces */
--canvas:       #F3F7F8;  /* App background */
--surface:      #FFFFFF;  /* Cards, forms */
--text:         #20323D;  /* Main text */
--muted:        #617580;  /* Secondary labels */
--warning:      #D99136;  /* Review states */
--danger:       #C84F55;  /* Errors, alerts */
--border:       #D9E3E7;  /* Dividers */
```

---

## Detailed Tasks

| # | Task | File to Create | Days |
|---|------|---------------|------|
| 1 | Initialize Next.js 14 project with TypeScript + Tailwind + shadcn/ui | `frontend/` root | 0.5 |
| 2 | Configure design tokens in Tailwind config | `frontend/tailwind.config.ts` | 0.5 |
| 3 | Build AppShell: Sidebar + Topbar layout | `components/layout/AppShell.tsx` | 1 |
| 4 | Build Sidebar with navigation links + icons | `components/layout/Sidebar.tsx` | 0.5 |
| 5 | Build Topbar with workspace switcher | `components/layout/Topbar.tsx` | 0.5 |
| 6 | Create all page routes (empty screens) | `app/(app)/*/page.tsx` | 0.5 |
| 7 | Build MetricCard component | `components/ui/MetricCard.tsx` | 0.5 |
| 8 | Build DataTable component with sorting/pagination | `components/ui/DataTable.tsx` | 1 |
| 9 | Build FilterBar component | `components/ui/FilterBar.tsx` | 0.5 |
| 10 | Build LineChart / AreaChart wrappers | `components/charts/LineChart.tsx` | 1 |
| 11 | Build Login page UI | `app/(auth)/login/page.tsx` | 0.5 |
| 12 | Build Dashboard page with mock data | `app/(app)/dashboard/page.tsx` | 0.5 |
| 13 | Add loading skeletons and empty states | `components/ui/Skeleton.tsx` | 0.5 |

---

## Frontend Folder Structure

```
frontend/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   └── (app)/
│       ├── layout.tsx                ← AppShell lives here
│       ├── dashboard/
│       │   └── page.tsx
│       ├── sites/
│       │   ├── page.tsx
│       │   └── [siteId]/
│       │       └── page.tsx
│       ├── systems/
│       │   └── [systemId]/
│       │       └── page.tsx
│       ├── imports/
│       │   ├── page.tsx
│       │   └── new/
│       │       └── page.tsx
│       ├── readings/
│       │   └── page.tsx
│       ├── analytics/
│       │   └── page.tsx
│       ├── alerts/
│       │   └── page.tsx
│       └── reports/
│           └── page.tsx
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   ├── WorkspaceSwitcher.tsx
│   │   ├── SiteSystemSelector.tsx
│   │   └── Breadcrumbs.tsx
│   ├── ui/
│   │   ├── MetricCard.tsx
│   │   ├── DataTable.tsx
│   │   ├── FilterBar.tsx
│   │   ├── DateRangePicker.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ErrorState.tsx
│   │   ├── Skeleton.tsx
│   │   ├── Pagination.tsx
│   │   ├── FilterChips.tsx
│   │   ├── ExportMenu.tsx
│   │   └── ConfirmDialog.tsx
│   ├── charts/
│   │   ├── LineChart.tsx
│   │   ├── AreaChart.tsx
│   │   ├── ScatterChart.tsx
│   │   ├── ChartToolbar.tsx
│   │   ├── ChartLegend.tsx
│   │   └── ChartEmptyState.tsx
│   └── feedback/
│       ├── Toast.tsx
│       └── LoadingSpinner.tsx
├── lib/
│   ├── api-client.ts
│   ├── query-client.ts
│   ├── auth.ts
│   └── format.ts
├── types/
│   └── index.ts
├── hooks/
│   └── useFilters.ts
├── styles/
│   └── globals.css
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

---

## Screens to Build (All with Mock Data)

| Screen | Route | Key Components |
|--------|-------|----------------|
| Login | `/login` | Form, brand panel |
| Dashboard | `/dashboard` | 4 KPI cards, 2 charts, alerts panel |
| Sites List | `/sites` | Table, search, create button |
| Site Detail | `/sites/[id]` | Profile, systems list, activity |
| Systems | `/systems/[id]` | Config form, performance snapshot |
| Imports | `/imports` | History table, status badges |
| Import Wizard | `/imports/new` | Multi-step form |
| Readings | `/readings` | Filter bar, sortable table |
| Analytics | `/analytics` | Date range, charts, run button |
| Alerts | `/alerts` | Severity filters, evidence panel |
| Reports | `/reports` | Builder, preview, download |

---

## Install Commands

```bash
npx create-next-app@latest frontend --typescript --tailwind --app
cd frontend
npx shadcn@latest init
npx shadcn@latest add button card input table badge dialog
npm install @tanstack/react-query plotly.js react-plotly.js lucide-react
npm install react-hook-form zod @hookform/resolvers
npm install axios date-fns
```

---

## Exit Gate — All Must Pass

- [ ] Next.js app runs at `localhost:3000`
- [ ] All 11 page routes accessible via sidebar navigation
- [ ] Design tokens applied (teal sidebar, correct colors)
- [ ] Responsive: works at mobile / tablet / desktop widths
- [ ] MetricCard, DataTable, FilterBar, LineChart components built
- [ ] Loading skeleton and empty state components exist
- [ ] No real API calls yet — all mock/static data
- [ ] TypeScript has no errors (`npm run build` passes)
