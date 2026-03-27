# Phase 3 Date Range And Heatmap Performance

## Goal

Close the two largest residual performance gaps after layered summaries:

- Custom `start_date/end_date` analytics still falling back to raw `crimes`
- Geo heatmap requests under `month / ward / beat / community_area` filters still leaning on expensive raw-table index intersections

## Decision

### 1. Add `crimes_daily_summary`

Use a dedicated daily-grain summary for date-range analytics that do not depend on raw-only extended dimensions.

Table shape:

- `crime_date`
- `crime_year`
- `crime_month`
- `primary_type`
- `district`
- `arrest`
- `domestic`
- `crime_count`

Reasoning:

- Real grouped row count is about `2,923,006`, which is materially smaller than raw `crimes`
- It directly accelerates date-range versions of yearly trend, type proportion, district comparison, arrest/domestic splits, and type arrest rate
- It avoids building a much larger daily extended-filter summary

### 2. Add targeted raw heatmap indexes

Do not build a dedicated geo summary table.

Measured grouped row counts for a geo summary were too large:

- basic geo summary candidate: about `5,191,961`
- geo summary with `primary_type`: about `6,582,647`

Instead, add focused raw-table indexes on:

- `(year, crime_month, lat_round3, lng_round3)`
- `(year, ward, lat_round3, lng_round3)`
- `(year, beat, lat_round3, lng_round3)`
- `(year, community_area, lat_round3, lng_round3)`
- `(year, district, lat_round3, lng_round3)`

Reasoning:

- This keeps the spatial path on the raw table, which preserves exact filter fidelity
- It materially reduces the remaining hot map queries without creating a near-raw-scale summary table

## Measured Results

### Custom date range

Raw before:

- yearly trend over `2023-03-01` to `2023-08-31`: about `64.7ms`
- type proportion over the same range: about `42.9ms`

Daily summary after:

- yearly trend equivalent: about `14.5ms`
- type proportion equivalent: about `15.6ms`
- district comparison equivalent: about `15.0ms`

### Heatmap

Before targeted raw indexes:

- `year=2023 AND crime_month=2`: about `56ms`
- `year=2023 AND ward=22 AND domestic=1`: about `298ms`
- `year=2023 AND beat='0711' AND domestic=1`: about `247ms`

After targeted raw indexes:

- `year=2023 AND crime_month=2`: about `7.9ms`
- `year=2023 AND ward=22 AND domestic=1`: about `63.8ms`
- `year=2023 AND beat='0711' AND domestic=1`: about `9.3ms`

## Residual Gap

The `ward/domestic` heatmap path is greatly improved but still not fully optimal because `domestic` is still applied after the `year+ward+lat/lng` range scan. If needed, a later phase can add a smaller set of extra domestic-specific spatial indexes for the highest-traffic combinations.
