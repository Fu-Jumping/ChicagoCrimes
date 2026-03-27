# Phase 2 Layered Performance Architecture Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Replace the fragile “single summary table does everything” assumption with a layered performance architecture that is aligned with the real database shape, accelerates extended filter queries, and keeps safe fallbacks when specialized summary tables are absent.

**Architecture:** Keep the current compact `crimes_summary` for broad overview aggregations, add a dedicated `crimes_filter_summary` for high-value extended-filter analytics, and add a dedicated `crimes_location_summary` for location-type charts. The backend should detect which summary tables really exist and only use fast paths that the physical database can support; otherwise it must fall back cleanly to the raw `crimes` table.

**Tech Stack:** MySQL 8, FastAPI, SQLAlchemy, Python unittest, Electron/React frontend observability, SQL migration scripts.

---

### Task 1: Lock in the design with measured constraints

**Files:**
- Create: `docs/plans/2026-03-28-phase2-layered-performance-architecture.md`

**Step 1: Record the measured facts**

- `crimes` is ~7.8M rows and ~3.9GB.
- Current `crimes_summary` is ~297K rows and ~76MB.
- A single “everything summary” explodes to ~7.6M grouped rows and is not worth building.
- A targeted `crimes_filter_summary` grouped by `year/month/primary_type/district/beat/ward/community_area/arrest/domestic` is ~2.5M grouped rows and is worthwhile.
- A targeted `crimes_location_summary` grouped by `year/month/primary_type/district/location_description/arrest/domestic` is ~1.77M grouped rows and is worthwhile.
- Weekly/hourly raw queries are already acceptable under existing generated-column indexes, so they are not phase-2 priorities.

### Task 2: Add failing backend tests for layered summary capability detection and table selection

**Files:**
- Create: `backend/tests/test_layered_summary_capabilities.py`

**Step 1: Write the failing tests**

- Assert summary-capability detection distinguishes base summary, filter summary, and location summary instead of only checking for `crimes_summary`.
- Assert `get_yearly_trend` can use the filter summary when `beat/ward/community_area` filters are present and the filter summary is available.
- Assert `get_filter_options` can use the filter summary for distinct `beat/ward/community_area` lookups.
- Assert `get_location_types_top` only uses the location summary when that table is available; otherwise it falls back safely.
- Assert weekly/hourly queries do not assume `day_of_week` / `hour` exist on the legacy base summary.

**Step 2: Run test to verify it fails**

Run:
- `python -m unittest tests.test_layered_summary_capabilities -q`

Expected: FAIL because the backend still treats summary support as a single boolean and still conflates logical fast paths with physical table shape.

### Task 3: Implement layered summary models and safe capability detection

**Files:**
- Modify: `backend/app/models/crime.py`
- Modify: `backend/app/services/analytics.py`

**Step 1: Write minimal implementation**

- Add ORM models for `crimes_filter_summary` and `crimes_location_summary`.
- Replace `_summary_available` with structured capability detection based on actual table/column existence.
- Add helper filter appliers for base summary, filter summary, and location summary.
- Prevent weekly/hourly code from referencing non-existent legacy summary columns.

**Step 2: Run test to verify it passes**

Run:
- `python -m unittest tests.test_layered_summary_capabilities -q`

Expected: PASS

### Task 4: Add rebuildable database assets for the new layered summaries

**Files:**
- Create: `backend/sql/rebuild_layered_summaries.sql`
- Create: `backend/scripts/rebuild_layered_summaries.py`

**Step 1: Create rebuild assets**

- Build `crimes_filter_summary` from `crimes`.
- Build `crimes_location_summary` from `crimes`.
- Add supporting indexes for common filter/group-by paths.
- Keep the script idempotent and safe to rerun.

**Step 2: Run the rebuild script against the real database**

Run:
- `python backend/scripts/rebuild_layered_summaries.py`

Expected: New summary tables exist and are populated.

### Task 5: Route high-value analytics to the new fast paths

**Files:**
- Modify: `backend/app/services/analytics.py`
- Optionally modify: `backend/main.py`

**Step 1: Write minimal implementation**

- Route `yearly/monthly trend`, `types proportion`, `district comparison`, `arrests rate`, `domestic proportion`, `geo districts`, and `filter options` to `crimes_filter_summary` when it is available and the request shape is compatible.
- Route `location/types` to `crimes_location_summary` when it is available and the request shape is compatible.
- Expose summary capability status in health/observability output if helpful.

**Step 2: Run focused verification**

Run:
- `python -m unittest tests.test_layered_summary_capabilities tests.test_extended_filters tests.test_task4_validation tests.test_task5_special_validation -q`

Expected: PASS

### Task 6: Verification and measured follow-up

**Files:**
- Update docs only if needed

**Step 1: Run backend verification**

Run:
- `python -m unittest tests.test_extended_filters tests.test_task4_validation tests.test_task5_special_validation tests.test_summary_fast_paths tests.test_layered_summary_capabilities -q`

**Step 2: Run frontend verification**

Run:
- `cd frontend && npm run typecheck`
- `cd frontend && npm test`

**Step 3: Re-check actual query plans**

- Re-run `EXPLAIN ANALYZE` for:
  - `DISTINCT beat/ward/community_area`
  - `location_description` top-N
  - representative extended-filter aggregates

**Step 4: Record actual residual gaps**

- Custom `start_date/end_date` ranges will still require raw-table fallbacks unless a dedicated date-grain summary is added later.
- Geo heatmap will still use raw coordinate aggregation unless a dedicated spatial bucket summary is added later.
