# Filter Performance Targeted Optimization Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Fix collapsed-sidebar button alignment and reduce chart latency when global filters change, especially for year-based and rapid successive filter updates.

**Architecture:** Keep the current page/view structure, but remove redundant full-year date params from frontend requests, debounce filter-driven request params in the renderer, and reconnect backend analytics services to the existing `crimes_summary` fast path for weekly/hourly/location queries. Preserve current UI behavior while reducing unnecessary raw-table scans and stale overlapping requests.

**Tech Stack:** React 19, TypeScript, Ant Design, Axios, FastAPI, SQLAlchemy, Vitest, unittest.

---

### Task 1: Add failing frontend tests for filter-param trimming, debouncing, and collapsed alignment

**Files:**
- Modify: `frontend/src/renderer/src/components/AppLayout.test.tsx`
- Create: `frontend/src/renderer/src/utils/filterParams.test.ts`
- Create: `frontend/src/renderer/src/hooks/useDebouncedValue.test.tsx`

**Step 1: Write the failing tests**

- Assert `buildAnalyticsFilterParams` omits `start_date` and `end_date` when they exactly match the selected year boundary.
- Assert a debounced hook only publishes the latest rapid value after the configured delay.
- Assert the sidebar toggle row gets a collapsed-centering class when the sidebar is collapsed.

**Step 2: Run test to verify it fails**

Run:
- `npx vitest run src/renderer/src/utils/filterParams.test.ts src/renderer/src/hooks/useDebouncedValue.test.tsx src/renderer/src/components/AppLayout.test.tsx`

Expected: FAIL because redundant full-year dates are still emitted, no debounced hook exists, and the collapsed toggle row has no centering class.

### Task 2: Add failing backend tests for summary fast paths

**Files:**
- Create: `backend/tests/test_summary_fast_paths.py`

**Step 1: Write the failing tests**

- Assert `get_weekly_trend` uses `CrimeSummary.day_of_week` when summary data is available and only summary-safe filters are active.
- Assert `get_hourly_trend` uses `CrimeSummary.hour` under the same conditions.
- Assert `get_location_types_top` uses `CrimeSummary.location_description` under the same conditions.

**Step 2: Run test to verify it fails**

Run:
- `python -m pytest backend/tests/test_summary_fast_paths.py -q`

Expected: FAIL because the summary model lacks those columns and the service still queries the raw crimes table.

### Task 3: Implement targeted performance fixes

**Files:**
- Modify: `frontend/src/renderer/src/utils/filterParams.ts`
- Create: `frontend/src/renderer/src/hooks/useDebouncedValue.ts`
- Modify: `frontend/src/renderer/src/components/AppLayout.tsx`
- Modify: `frontend/src/renderer/src/views/Dashboard.tsx`
- Modify: `frontend/src/renderer/src/views/TrendAnalysis.tsx`
- Modify: `frontend/src/renderer/src/views/TypeAnalysis.tsx`
- Modify: `frontend/src/renderer/src/views/DistrictAnalysis.tsx`
- Modify: `frontend/src/renderer/src/views/MapView.tsx`
- Modify: `frontend/src/renderer/src/assets/main.css`
- Modify: `backend/app/models/crime.py`
- Modify: `backend/app/services/analytics.py`

**Step 1: Write minimal implementation**

- Add helper logic so full-year date ranges are not sent as redundant API params when `year` already fully defines the range.
- Introduce a small debounced-value hook and switch filter-driven view requests and sidebar option loading to use debounced params instead of immediate params.
- Center the collapse button row when the sidebar is collapsed.
- Extend `CrimeSummary` with `day_of_week`, `hour`, and `location_description`.
- Route weekly, hourly, and location-type analytics through summary queries when summary-safe filters are active.

**Step 2: Run focused tests to verify it passes**

Run:
- `npx vitest run src/renderer/src/utils/filterParams.test.ts src/renderer/src/hooks/useDebouncedValue.test.tsx src/renderer/src/components/AppLayout.test.tsx`
- `python -m pytest backend/tests/test_summary_fast_paths.py -q`

Expected: PASS

### Task 4: Full verification

**Files:**
- Modify: any snapshots or test wiring only if needed

**Step 1: Run frontend verification**

Run:
- `npm run typecheck`
- `npm test`

**Step 2: Run backend verification**

Run:
- `python -m pytest backend/tests/test_extended_filters.py backend/tests/test_task4_validation.py backend/tests/test_task5_special_validation.py backend/tests/test_summary_fast_paths.py -q`

**Step 3: Record actual status**

- If anything fails, fix it before claiming success.
- Note any remaining performance work that would require a DB migration, such as adding more indexes or rebuilding the summary table.
