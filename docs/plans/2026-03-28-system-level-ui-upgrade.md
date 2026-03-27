# System-Level UI Upgrade Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Deliver the approved mixed-balanced UI upgrade for the Chicago crime desktop app, covering grouped sidebar filters, a redesigned brand/header area, route-specific backgrounds, clearer typography hierarchy, layered analysis cards, and refined chart/map styling without changing analytics behavior.

**Architecture:** Centralize route presentation metadata so `AppLayout.tsx` can drive the brand copy, current-view summary, and page-specific background assets from one source of truth. Introduce a shared analysis card shell that separates title bars from chart canvases, then apply a common chart theme helper to the D3 components and a dedicated map theme helper to `CrimeHeatMap.tsx`. Preserve existing routes, global filters, and API calls; the work is structural and visual only.

**Tech Stack:** React 19, TypeScript, Ant Design 6, D3 v7, React Router 7, React Leaflet, Vitest, CSS variables

**Required workflow:** Follow `@test-driven-development` for each task and use `@verification-before-completion` before claiming the upgrade is finished.

---

### Task 1: Define route presentation metadata and sidebar taxonomy

**Files:**
- Create: `frontend/src/renderer/src/utils/routePresentation.ts`
- Create: `frontend/src/renderer/src/utils/routePresentation.test.ts`
- Modify: `frontend/src/renderer/src/utils/sidebarFilters.ts`
- Modify: `frontend/src/renderer/src/utils/sidebarFilters.test.ts`
- Modify: `frontend/src/renderer/src/i18n/zh-CN.json`

**Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { getRoutePresentation } from './routePresentation'
import { SIDEBAR_FILTER_GROUPS, SIDEBAR_FILTER_LABELS } from './sidebarFilters'

describe('routePresentation', () => {
  it('maps every primary route to a dedicated presentation profile', () => {
    expect(getRoutePresentation('/').backgroundKey).toBe('overview')
    expect(getRoutePresentation('/trend').backgroundKey).toBe('trend')
    expect(getRoutePresentation('/map').title).toBe('空间地图')
  })
})

describe('sidebarFilters', () => {
  it('groups the global controls into named control-center sections', () => {
    expect(SIDEBAR_FILTER_GROUPS.map((group) => group.key)).toEqual([
      'time',
      'event',
      'space'
    ])
    expect(SIDEBAR_FILTER_LABELS.communityArea).toBe('社区筛选')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/renderer/src/utils/routePresentation.test.ts src/renderer/src/utils/sidebarFilters.test.ts`

Expected: FAIL with `Cannot find module './routePresentation'` and old sidebar copy assertions.

**Step 3: Write the minimal implementation**

```ts
// frontend/src/renderer/src/utils/routePresentation.ts
export interface RoutePresentation {
  title: string
  description: string
  backgroundKey: 'overview' | 'trend' | 'type' | 'district' | 'map'
}

const PRESENTATION_MAP: Record<string, RoutePresentation> = {
  '/': { title: '综合总览', description: '总览芝加哥犯罪态势', backgroundKey: 'overview' },
  '/trend': { title: '趋势分析', description: '观察时间序列变化', backgroundKey: 'trend' },
  '/type': { title: '类型分析', description: '比较案件类型结构', backgroundKey: 'type' },
  '/district': { title: '区域分析', description: '对比城市空间差异', backgroundKey: 'district' },
  '/map': { title: '空间地图', description: '查看空间热点分布', backgroundKey: 'map' }
}

export const getRoutePresentation = (pathname: string): RoutePresentation =>
  PRESENTATION_MAP[pathname] ?? PRESENTATION_MAP['/']
```

```ts
// frontend/src/renderer/src/utils/sidebarFilters.ts
export const SIDEBAR_FILTER_GROUPS = [
  { key: 'time', title: '时间范围', fields: ['year', 'month', 'dateRange'] },
  { key: 'event', title: '事件条件', fields: ['type', 'arrest', 'domestic'] },
  { key: 'space', title: '空间范围', fields: ['district', 'beat', 'ward', 'communityArea'] }
] as const

export const SIDEBAR_FILTER_LABELS = {
  sectionTitle: '全局分析参数',
  communityArea: '社区筛选'
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/renderer/src/utils/routePresentation.test.ts src/renderer/src/utils/sidebarFilters.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/renderer/src/utils/routePresentation.ts frontend/src/renderer/src/utils/routePresentation.test.ts frontend/src/renderer/src/utils/sidebarFilters.ts frontend/src/renderer/src/utils/sidebarFilters.test.ts frontend/src/renderer/src/i18n/zh-CN.json
git commit -m "feat(frontend): define route presentation metadata"
```

### Task 2: Rebuild the app chrome with branded header, grouped sidebar, and route backgrounds

**Files:**
- Create: `frontend/src/renderer/src/assets/backgrounds/index.ts`
- Create: `frontend/src/renderer/src/assets/backgrounds/overview.jpg`
- Create: `frontend/src/renderer/src/assets/backgrounds/trend.jpg`
- Create: `frontend/src/renderer/src/assets/backgrounds/type.jpg`
- Create: `frontend/src/renderer/src/assets/backgrounds/district.jpg`
- Create: `frontend/src/renderer/src/assets/backgrounds/map.jpg`
- Modify: `frontend/src/renderer/src/components/AppLayout.tsx`
- Modify: `frontend/src/renderer/src/components/TitleBar.tsx`
- Modify: `frontend/src/renderer/src/assets/base.css`
- Modify: `frontend/src/renderer/src/assets/main.css`
- Modify: `frontend/src/renderer/src/assets/themes/dark.css`
- Modify: `frontend/src/renderer/src/assets/themes/light.css`
- Test: `frontend/src/renderer/src/components/AppLayout.test.tsx`

**Step 1: Write the failing UI test**

```tsx
it('renders the mixed-balanced app chrome with brand, grouped filters, and route backdrop', () => {
  const { container } = renderLayout()

  expect(screen.getByText('芝加哥犯罪可视化')).toBeInTheDocument()
  expect(screen.getByText('时间范围')).toBeInTheDocument()
  expect(screen.getByText('事件条件')).toBeInTheDocument()
  expect(screen.getByText('空间范围')).toBeInTheDocument()
  expect(screen.getByText('社区筛选')).toBeInTheDocument()
  expect(container.querySelector('.app-route-backdrop')).toBeInTheDocument()
})
```

**Step 2: Run the test to verify it fails**

Run: `npx vitest run src/renderer/src/components/AppLayout.test.tsx -t "renders the mixed-balanced app chrome with brand, grouped filters, and route backdrop"`

Expected: FAIL because the old brand, old filter grouping, and missing backdrop container are still rendered.

**Step 3: Write the minimal implementation**

1. Copy the 5 source images from `img/` into `frontend/src/renderer/src/assets/backgrounds/` using semantic filenames (`overview.jpg`, `trend.jpg`, `type.jpg`, `district.jpg`, `map.jpg`) so Vite can package them reliably while keeping the originals untouched.
2. Export a background map from `frontend/src/renderer/src/assets/backgrounds/index.ts`.
3. Update `AppLayout.tsx` to:
   - read `getRoutePresentation(location.pathname)`
   - render a backdrop stack (`image layer + theme overlay + texture layer`)
   - replace the old glowing rectangle with a brand mark and text group
   - render sidebar sections from `SIDEBAR_FILTER_GROUPS`
   - add a compact filter summary block
4. Update `TitleBar.tsx` to use the shorter product name in the native drag bar.
5. Add theme tokens and CSS classes for transparent panels, backdrop layering, and grouped sidebar sections.

```tsx
const presentation = getRoutePresentation(location.pathname)

return (
  <div
    className="app-route-backdrop"
    style={{ ['--route-bg-url' as '--route-bg-url']: `url(${backgrounds[presentation.backgroundKey]})` }}
  >
    <div className="app-route-backdrop__image" />
    <div className="app-route-backdrop__overlay" />
    <div className="app-route-backdrop__texture" />
    {/* existing layout goes here */}
  </div>
)
```

**Step 4: Run tests to verify the chrome passes**

Run: `npm run test:ui`

Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/renderer/src/assets/backgrounds frontend/src/renderer/src/components/AppLayout.tsx frontend/src/renderer/src/components/TitleBar.tsx frontend/src/renderer/src/assets/base.css frontend/src/renderer/src/assets/main.css frontend/src/renderer/src/assets/themes/dark.css frontend/src/renderer/src/assets/themes/light.css frontend/src/renderer/src/components/AppLayout.test.tsx
git commit -m "feat(frontend): rebuild app chrome with grouped controls"
```

### Task 3: Introduce a shared analysis module card and stronger page-title hierarchy

**Files:**
- Create: `frontend/src/renderer/src/components/InsightCard.tsx`
- Create: `frontend/src/renderer/src/components/InsightCard.test.tsx`
- Modify: `frontend/src/renderer/src/components/AnalysisPageShell.tsx`
- Modify: `frontend/src/renderer/src/assets/main.css`

**Step 1: Write the failing component test**

```tsx
import { render, screen } from '@testing-library/react'
import InsightCard from './InsightCard'

it('separates module title chrome from the chart content body', () => {
  const { container } = render(
    <InsightCard eyebrow="趋势模块" title="月度案件趋势" description="观察月度变化">
      <div>chart</div>
    </InsightCard>
  )

  expect(screen.getByText('趋势模块')).toBeInTheDocument()
  expect(screen.getByText('月度案件趋势')).toBeInTheDocument()
  expect(container.querySelector('.analysis-module-card__header')).toBeInTheDocument()
  expect(container.querySelector('.analysis-module-card__body')).toBeInTheDocument()
})
```

**Step 2: Run the test to verify it fails**

Run: `npx vitest run src/renderer/src/components/InsightCard.test.tsx`

Expected: FAIL with `Cannot find module './InsightCard'`.

**Step 3: Write the minimal implementation**

```tsx
// frontend/src/renderer/src/components/InsightCard.tsx
export interface InsightCardProps {
  eyebrow?: string
  title: React.ReactNode
  description?: string
  extra?: React.ReactNode
  children: React.ReactNode
}

const InsightCard: React.FC<InsightCardProps> = ({ eyebrow, title, description, extra, children }) => (
  <section className="analysis-module-card">
    <header className="analysis-module-card__header">
      <div className="analysis-module-card__copy">
        {eyebrow ? <span className="analysis-module-card__eyebrow">{eyebrow}</span> : null}
        <h3 className="analysis-module-card__title">{title}</h3>
        {description ? <p className="analysis-module-card__description">{description}</p> : null}
      </div>
      {extra ? <div className="analysis-module-card__extra">{extra}</div> : null}
    </header>
    <div className="analysis-module-card__body">{children}</div>
  </section>
)
```

Update `AnalysisPageShell.tsx` so every page header uses:

- a small eyebrow line
- a larger Chinese primary title
- a lighter subtitle paragraph

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/renderer/src/components/InsightCard.test.tsx`

Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/renderer/src/components/InsightCard.tsx frontend/src/renderer/src/components/InsightCard.test.tsx frontend/src/renderer/src/components/AnalysisPageShell.tsx frontend/src/renderer/src/assets/main.css
git commit -m "feat(frontend): add layered analysis module cards"
```

### Task 4: Migrate all five views to the shared card structure

**Files:**
- Modify: `frontend/src/renderer/src/views/Dashboard.tsx`
- Modify: `frontend/src/renderer/src/views/TrendAnalysis.tsx`
- Modify: `frontend/src/renderer/src/views/TypeAnalysis.tsx`
- Modify: `frontend/src/renderer/src/views/DistrictAnalysis.tsx`
- Modify: `frontend/src/renderer/src/views/MapView.tsx`
- Modify: `frontend/src/renderer/src/tests/visual-regression.test.tsx`
- Modify: `frontend/src/renderer/src/tests/__snapshots__/visual-regression.test.tsx.snap`

**Step 1: Write the failing visual regression**

Replace the stub-only visual test with a routed render that mounts `Dashboard` inside `AppLayout`, then assert the new shell classes before snapshotting.

```tsx
expect(container.querySelectorAll('.analysis-module-card').length).toBeGreaterThan(0)
expect(container.querySelector('.analysis-shell__eyebrow')).toBeInTheDocument()
expect(container.firstChild).toMatchSnapshot()
```

**Step 2: Run the visual test to verify it fails**

Run: `npx vitest run src/renderer/src/tests/visual-regression.test.tsx`

Expected: FAIL because the views still render plain `Antd Card` blocks and the snapshot no longer matches.

**Step 3: Write the minimal implementation**

1. Replace direct `Card` usage in all five views with `InsightCard`.
2. Move short card descriptions and comparison controls into each card header.
3. Update page shell copy so the title/subtitle hierarchy reflects the approved design.
4. Keep existing data loading, retry, and comparison logic unchanged.

```tsx
<InsightCard
  eyebrow="趋势模块"
  title={t('pages.trend.monthlyCard')}
  description="按月份观察案件量波动与年度对比。"
  extra={<ComparisonSelect ... />}
>
  <DataStatePanel ...>
    <LineChart ... />
  </DataStatePanel>
</InsightCard>
```

**Step 4: Run the visual test and update the snapshot**

Run: `npx vitest run src/renderer/src/tests/visual-regression.test.tsx -u`

Expected: PASS with an updated snapshot that includes the new shell and module-card hierarchy.

**Step 5: Commit**

```bash
git add frontend/src/renderer/src/views/Dashboard.tsx frontend/src/renderer/src/views/TrendAnalysis.tsx frontend/src/renderer/src/views/TypeAnalysis.tsx frontend/src/renderer/src/views/DistrictAnalysis.tsx frontend/src/renderer/src/views/MapView.tsx frontend/src/renderer/src/tests/visual-regression.test.tsx frontend/src/renderer/src/tests/__snapshots__/visual-regression.test.tsx.snap
git commit -m "refactor(frontend): migrate views to shared analysis cards"
```

### Task 5: Create a reusable chart theme helper and restyle the D3 charts

**Files:**
- Create: `frontend/src/renderer/src/utils/chartTheme.ts`
- Create: `frontend/src/renderer/src/utils/chartTheme.test.ts`
- Modify: `frontend/src/renderer/src/components/charts/LineChart.tsx`
- Modify: `frontend/src/renderer/src/components/charts/BarChart.tsx`
- Modify: `frontend/src/renderer/src/components/charts/PieChart.tsx`
- Modify: `frontend/src/renderer/src/components/charts/RoseChart.tsx`
- Modify: `frontend/src/renderer/src/assets/main.css`

**Step 1: Write the failing unit test**

```ts
import { describe, expect, it } from 'vitest'
import { getChartTheme } from './chartTheme'

describe('chartTheme', () => {
  it('returns layered palette values for dark and light modes', () => {
    const dark = getChartTheme('dark')
    const light = getChartTheme('light')

    expect(dark.lineFillGradient.length).toBeGreaterThan(0)
    expect(light.tooltipBackground).toContain('rgba')
  })
})
```

**Step 2: Run the test to verify it fails**

Run: `npx vitest run src/renderer/src/utils/chartTheme.test.ts`

Expected: FAIL with `Cannot find module './chartTheme'`.

**Step 3: Write the minimal implementation**

1. Add `getChartTheme(themeMode)` that returns palette, gradient stops, tooltip tokens, grid color, and active highlight color.
2. Update `LineChart.tsx` to add:
   - filled area gradients
   - stronger hover dots
   - themed tooltip classes
3. Update `BarChart.tsx` to add:
   - vertical gradient fills
   - rounded corners or softened tops
   - toned-down grid lines
4. Update `PieChart.tsx` and `RoseChart.tsx` to:
   - share a curated palette
   - use lighter label strokes
   - render tooltip chrome consistent with the line/bar charts

```ts
export const getChartTheme = (mode: 'dark' | 'light') => ({
  tooltipBackground: mode === 'dark' ? 'rgba(7, 13, 24, 0.92)' : 'rgba(255, 255, 255, 0.94)',
  gridStroke: mode === 'dark' ? 'rgba(219, 252, 255, 0.10)' : 'rgba(16, 33, 58, 0.10)',
  lineFillGradient: ['rgba(0, 240, 255, 0.28)', 'rgba(0, 240, 255, 0.02)']
})
```

**Step 4: Run tests to verify the helper passes and the app still typechecks**

Run: `npx vitest run src/renderer/src/utils/chartTheme.test.ts`

Expected: PASS

Run: `npm run typecheck`

Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/renderer/src/utils/chartTheme.ts frontend/src/renderer/src/utils/chartTheme.test.ts frontend/src/renderer/src/components/charts/LineChart.tsx frontend/src/renderer/src/components/charts/BarChart.tsx frontend/src/renderer/src/components/charts/PieChart.tsx frontend/src/renderer/src/components/charts/RoseChart.tsx frontend/src/renderer/src/assets/main.css
git commit -m "feat(frontend): apply a shared visual language to charts"
```

### Task 6: Theme the map presentation and align the spatial page with the rest of the system

**Files:**
- Create: `frontend/src/renderer/src/utils/mapTheme.ts`
- Create: `frontend/src/renderer/src/utils/mapTheme.test.ts`
- Modify: `frontend/src/renderer/src/components/charts/CrimeHeatMap.tsx`
- Modify: `frontend/src/renderer/src/views/MapView.tsx`
- Modify: `frontend/src/renderer/src/views/MapView.test.tsx`

**Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { getMapTheme } from './mapTheme'

describe('mapTheme', () => {
  it('returns tile, heat, and district overlay tokens for both themes', () => {
    expect(getMapTheme('dark').districtStroke).toBeTruthy()
    expect(getMapTheme('light').heatGradient[0]).toBeTruthy()
  })
})
```

```tsx
it('renders the map inside the layered analysis card shell', async () => {
  const { container } = renderView('/map')

  await waitFor(() => {
    expect(screen.getByTestId('crime-heatmap')).toBeInTheDocument()
  })

  expect(container.querySelector('.analysis-module-card')).toBeInTheDocument()
})
```

**Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/renderer/src/utils/mapTheme.test.ts src/renderer/src/views/MapView.test.tsx`

Expected: FAIL because `mapTheme.ts` does not exist and `MapView` still uses the old card wrapper.

**Step 3: Write the minimal implementation**

1. Add `getMapTheme(themeMode)` to centralize:
   - tile URL
   - tooltip surface colors
   - district border/fill colors
   - heat gradient
2. Update `CrimeHeatMap.tsx` to consume the theme helper and apply the shared tooltip/control styling.
3. Update `MapView.tsx` to use `InsightCard` and the new map-focused card copy.

```ts
export const getMapTheme = (mode: 'dark' | 'light') => ({
  tileUrl:
    mode === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  districtStroke: mode === 'dark' ? '#77f7ff' : '#006dff'
})
```

**Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/renderer/src/utils/mapTheme.test.ts src/renderer/src/views/MapView.test.tsx`

Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/renderer/src/utils/mapTheme.ts frontend/src/renderer/src/utils/mapTheme.test.ts frontend/src/renderer/src/components/charts/CrimeHeatMap.tsx frontend/src/renderer/src/views/MapView.tsx frontend/src/renderer/src/views/MapView.test.tsx
git commit -m "feat(frontend): theme the spatial analysis map"
```

### Task 7: Run the full regression gate and fix any remaining compatibility issues

**Files:**
- Modify: `frontend/src/renderer/src/components/AppLayout.test.tsx`
- Modify: `frontend/src/renderer/src/tests/visual-regression.test.tsx`
- Modify: `frontend/src/renderer/src/tests/__snapshots__/visual-regression.test.tsx.snap`
- Modify: any frontend file touched above that still fails lint, typecheck, or snapshot verification

**Step 1: Add the last missing assertions before the final gate**

Make sure `AppLayout.test.tsx` explicitly checks:

- `芝加哥犯罪可视化`
- `时间范围`
- `事件条件`
- `空间范围`
- `社区筛选`
- the presence of `.analysis-module-card`

**Step 2: Run the focused tests first**

Run: `npm run test:unit`

Expected: PASS or a small set of focused failures tied to the new presentation system.

**Step 3: Write the minimal compatibility fixes**

Fix only the failing selectors, mocks, or class names in the touched frontend files. Do not introduce new UI scope in this step.

**Step 4: Run the complete verification gate**

Run: `npm run typecheck`

Expected: PASS

Run: `npm run test:ui`

Expected: PASS

Run: `npm run test:visual`

Expected: PASS

Run: `npm run test:unit`

Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/renderer/src/components/AppLayout.test.tsx frontend/src/renderer/src/tests/visual-regression.test.tsx frontend/src/renderer/src/tests/__snapshots__/visual-regression.test.tsx.snap
git commit -m "test(frontend): lock in the system-level UI upgrade"
```

---

Plan complete and saved to `docs/plans/2026-03-28-system-level-ui-upgrade.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh helper agent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
