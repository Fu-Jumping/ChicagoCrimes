# Extended Global Filters And Map Interactions Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Expand the analytics stack to support additional global filters, replace the map month selector with a center-pointer scroller, and fix the outstanding chart and map labeling regressions.

**Architecture:** Extend the existing `analytics` router/service and `GlobalFiltersContext` rather than introducing a new filtering framework. Keep the UI aligned with the current Ant Design + React layout, but replace the month button list with a custom scroll-snap selector that maps cleanly to backend month filtering.

**Tech Stack:** FastAPI, SQLAlchemy, React 19, TypeScript, Ant Design, D3, Leaflet, Vitest, pytest/unittest.

---

### Task 1: Backend regression coverage for expanded filters

**Files:**
- Create: `backend/tests/test_extended_filters.py`
- Modify: `backend/tests/test_geo_analytics.py`

**Step 1: Write the failing test**

- Add service-level tests that prove filter application now includes `month`, `beat`, `ward`, `community_area`, and `domestic`.
- Add router-level tests that prove the new filter-option endpoints return normalized option payloads.
- Add geo endpoint tests that prove map requests accept the new shared filters.

**Step 2: Run test to verify it fails**

Run: `.\venv\Scripts\python.exe -m pytest tests/test_extended_filters.py tests/test_geo_analytics.py -q`

Expected: FAIL because the analytics service and router do not yet accept or apply the new filter fields.

**Step 3: Write minimal implementation**

- Extend shared filter plumbing in `backend/app/services/analytics.py`.
- Extend analytics endpoints in `backend/app/routers/analytics.py`.
- Add filter option helper endpoints that query distinct values.

**Step 4: Run test to verify it passes**

Run: `.\venv\Scripts\python.exe -m pytest tests/test_extended_filters.py tests/test_geo_analytics.py -q`

Expected: PASS

### Task 2: Frontend regression coverage for global filters and map scroller

**Files:**
- Create: `frontend/src/renderer/src/components/TimelinePlayer.test.tsx`
- Modify: `frontend/src/renderer/src/components/AppLayout.test.tsx`

**Step 1: Write the failing test**

- Assert the sidebar renders the added global filter controls with default “全部” semantics.
- Assert the new month scroller renders a fixed indicator and emits changes when centered selection changes.

**Step 2: Run test to verify it fails**

Run: `npm run test:ui -- --runInBand`

Expected: FAIL because the new controls and interaction model are not implemented yet.

**Step 3: Write minimal implementation**

- Extend the global filter state/query model.
- Add the new filter select components.
- Rebuild the timeline selector as a scroll-snap picker with center selection logic.

**Step 4: Run test to verify it passes**

Run: `npm run test:ui -- --runInBand`

Expected: PASS

### Task 3: Chart and map bug fixes

**Files:**
- Modify: `frontend/src/renderer/src/components/charts/PieChart.tsx`
- Modify: `frontend/src/renderer/src/components/charts/RoseChart.tsx`
- Modify: `frontend/src/renderer/src/components/charts/CrimeHeatMap.tsx`
- Modify: `frontend/src/renderer/src/utils/locationTypeMap.ts`
- Modify: `frontend/src/renderer/src/components/charts/BarChart.tsx`

**Step 1: Write the failing test**

- Cover location label normalization in a unit test.
- Extend or add a small rendering regression check for timeline/filters if needed.

**Step 2: Run test to verify it fails**

Run: `npm run test:unit`

Expected: FAIL because the location normalization and related UI assumptions are not implemented yet.

**Step 3: Write minimal implementation**

- Prevent pie/rose labels from crossing their own leader lines by enforcing safer line end points and hiding labels that still cannot fit.
- Remove the district tooltip rectangle while keeping district highlight/click behavior.
- Normalize location-description translation keys before lookup and add missing mappings.
- Ensure bar chart axis titles use the normalized translator.

**Step 4: Run test to verify it passes**

Run: `npm run test:unit`

Expected: PASS

### Task 4: Full verification

**Files:**
- Modify: `frontend/src/renderer/src/tests/__snapshots__/visual-regression.test.tsx.snap` if needed

**Step 1: Run focused verification**

Run:
- `.\venv\Scripts\python.exe -m pytest tests/test_extended_filters.py tests/test_geo_analytics.py tests/test_task3_contract.py -q`
- `npm run test:unit`
- `npm run test:ui`

**Step 2: Run full verification**

Run:
- `npm run typecheck`
- `npm run test`

**Step 3: Record actual status**

- If snapshots change intentionally, update them and re-run tests.
- If any verification fails, stop and fix before claiming completion.
