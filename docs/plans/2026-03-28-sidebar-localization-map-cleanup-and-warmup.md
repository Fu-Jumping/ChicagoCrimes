# Sidebar Localization, Map Cleanup, And Warmup Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Localize the left sidebar filter labels/options into Chinese, compress and make the sidebar collapsible, remove the fake center rectangle from the map canvas, and add a first-launch warmup experience that improves later page/filter responsiveness.

**Architecture:** Keep the existing `AppLayout` as the shell, but move sidebar labels and option formatters into explicit helpers so the UI can be localized consistently and tested directly. Add a lightweight frontend GET-response memory cache plus a staged warmup overlay in the renderer so first-launch prefetches can actually accelerate later route switches; remove the map rectangle by disabling the placeholder district overlay when the bundled GeoJSON is only a stub.

**Tech Stack:** React 19, TypeScript, Ant Design, Leaflet, Axios, Vitest.

---

### Task 1: Regression tests for localized compact sidebar and warmup overlay

**Files:**
- Modify: `frontend/src/renderer/src/components/AppLayout.test.tsx`
- Create: `frontend/src/renderer/src/utils/sidebarFilters.test.ts`

**Step 1: Write the failing test**

- Assert the sidebar shows Chinese labels for `Beat / Ward / Community Area`.
- Assert compact filter grid hooks/classes exist so the sidebar is no longer a purely vertical stack.
- Assert clicking the sidebar toggle adds the collapsed-state class.
- Assert the startup warmup overlay is visible while warmup is pending and disappears when warmup completes.
- Assert filter option formatter helpers output Chinese option labels.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/renderer/src/components/AppLayout.test.tsx src/renderer/src/utils/sidebarFilters.test.ts`

Expected: FAIL because the sidebar is still single-column, partially English, not collapsible, and has no startup warmup overlay/helper module.

**Step 3: Write minimal implementation**

- Add dedicated sidebar label/formatter helpers.
- Rebuild the filter section into a compact grid with full-width and half-width groups.
- Add a collapse toggle and collapsed sidebar state.
- Add warmup state plumbing so the layout can render an overlay.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/renderer/src/components/AppLayout.test.tsx src/renderer/src/utils/sidebarFilters.test.ts`

Expected: PASS

### Task 2: Regression test for placeholder district overlay removal

**Files:**
- Create: `frontend/src/renderer/src/utils/districtBoundaries.test.ts`
- Modify: `frontend/src/renderer/src/components/charts/CrimeHeatMap.tsx`

**Step 1: Write the failing test**

- Assert a bundled district-GeoJSON payload with only the current placeholder rectangle is treated as invalid for overlay rendering.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/renderer/src/utils/districtBoundaries.test.ts`

Expected: FAIL because the current map renders the placeholder overlay unconditionally.

**Step 3: Write minimal implementation**

- Extract a small helper that detects placeholder/stub district boundary data.
- Only render the GeoJSON overlay when the helper reports meaningful district boundaries.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/renderer/src/utils/districtBoundaries.test.ts`

Expected: PASS

### Task 3: Frontend warmup cache implementation

**Files:**
- Modify: `frontend/src/renderer/src/api/index.ts`
- Create: `frontend/src/renderer/src/hooks/useAppWarmup.ts`
- Modify: `frontend/src/renderer/src/components/RequestDebugPanel.tsx`
- Modify: `frontend/src/renderer/src/hooks/useRequestHistory.ts`

**Step 1: Write the failing test**

- Use the new AppLayout warmup regression to prove there is no staged warmup yet.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/renderer/src/components/AppLayout.test.tsx`

Expected: FAIL because there is no warmup method, no overlay, and no client-memory cache behavior.

**Step 3: Write minimal implementation**

- Add a small memory cache and in-flight dedupe layer for GET analytics requests.
- Add a `warmupAppData` API helper that preloads the common overview/trend/type/district/map datasets in stages.
- Add a `useAppWarmup` hook that drives a visible overlay with progress text.
- Count memory hits in request-history summaries/debug tags.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/renderer/src/components/AppLayout.test.tsx`

Expected: PASS

### Task 4: Full verification

**Files:**
- Modify: `frontend/src/renderer/src/tests/visual-regression.test.tsx`
- Modify: `frontend/src/renderer/src/tests/__snapshots__/visual-regression.test.tsx.snap` if needed

**Step 1: Run focused verification**

Run:
- `npx vitest run src/renderer/src/components/AppLayout.test.tsx src/renderer/src/utils/sidebarFilters.test.ts src/renderer/src/utils/districtBoundaries.test.ts`
- `npm run typecheck`

**Step 2: Run full frontend verification**

Run:
- `npm test`

**Step 3: Record actual status**

- Update snapshots only if the compact sidebar or warmup overlay intentionally changes the DOM output.
- If any test or typecheck fails, stop and fix before claiming completion.
