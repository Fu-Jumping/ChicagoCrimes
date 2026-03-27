-- Performance optimization migration for crimes table
-- Run this once against the database to add generated columns, composite indexes, and a summary table.
--
-- Usage:
--   mysql -h 127.0.0.1 -P 3306 -u school_app -p school_chicago_crime < backend/sql/optimize_performance.sql

-- ============================================================
-- Step 1: Add STORED generated columns for time dimensions
-- These replace func.month(date) / func.dayofweek(date) / func.hour(date)
-- so the optimizer can use B-Tree indexes instead of full-table scans.
-- ============================================================
ALTER TABLE crimes
  ADD COLUMN IF NOT EXISTS crime_month TINYINT UNSIGNED
    GENERATED ALWAYS AS (MONTH(`date`)) STORED AFTER `year`,
  ADD COLUMN IF NOT EXISTS crime_dow TINYINT UNSIGNED
    GENERATED ALWAYS AS (DAYOFWEEK(`date`)) STORED AFTER `crime_month`,
  ADD COLUMN IF NOT EXISTS crime_hour TINYINT UNSIGNED
    GENERATED ALWAYS AS (HOUR(`date`)) STORED AFTER `crime_dow`,
  ADD COLUMN IF NOT EXISTS lat_round3 DOUBLE
    GENERATED ALWAYS AS (ROUND(latitude, 3)) STORED AFTER `longitude`,
  ADD COLUMN IF NOT EXISTS lng_round3 DOUBLE
    GENERATED ALWAYS AS (ROUND(longitude, 3)) STORED AFTER `lat_round3`;

-- ============================================================
-- Step 2: Composite indexes that cover the most frequent query patterns
-- ============================================================

-- Yearly trend (no year filter, optional primary_type): GROUP BY year
CREATE INDEX IF NOT EXISTS idx_year_type ON crimes (year, primary_type);

-- Monthly trend: WHERE year = ? GROUP BY crime_month
CREATE INDEX IF NOT EXISTS idx_year_month ON crimes (year, crime_month);

-- Weekly trend: WHERE year = ? GROUP BY crime_dow
CREATE INDEX IF NOT EXISTS idx_year_dow ON crimes (year, crime_dow);

-- Hourly trend: WHERE year = ? GROUP BY crime_hour
CREATE INDEX IF NOT EXISTS idx_year_hour ON crimes (year, crime_hour);

-- Types proportion: WHERE year = ? GROUP BY primary_type ORDER BY count
CREATE INDEX IF NOT EXISTS idx_year_type_id ON crimes (year, primary_type, id);

-- Districts comparison: WHERE year = ? AND primary_type = ? GROUP BY district
CREATE INDEX IF NOT EXISTS idx_year_type_district ON crimes (year, primary_type, district);

-- Arrest / Domestic: WHERE year = ? GROUP BY arrest / domestic
CREATE INDEX IF NOT EXISTS idx_year_arrest ON crimes (year, arrest);
CREATE INDEX IF NOT EXISTS idx_year_domestic ON crimes (year, domestic);

-- Location types: WHERE year = ? AND primary_type = ? GROUP BY location_description
CREATE INDEX IF NOT EXISTS idx_year_type_location ON crimes (year, primary_type, location_description);

-- Geo heatmap: WHERE year = ? GROUP BY lat_round3, lng_round3
CREATE INDEX IF NOT EXISTS idx_year_lat_lng ON crimes (year, lat_round3, lng_round3);

-- ============================================================
-- Step 3: Pre-aggregated summary table
-- Collapses ~8M rows into ~150K rows grouped by (year, month, primary_type, district)
-- ============================================================
DROP TABLE IF EXISTS crimes_summary;

CREATE TABLE crimes_summary (
  id INT AUTO_INCREMENT PRIMARY KEY,
  year SMALLINT UNSIGNED NOT NULL,
  month TINYINT UNSIGNED NOT NULL,
  day_of_week TINYINT UNSIGNED NOT NULL COMMENT 'MySQL DAYOFWEEK: 1=Sun..7=Sat',
  hour TINYINT UNSIGNED NOT NULL,
  primary_type VARCHAR(100) NOT NULL,
  district VARCHAR(10) NOT NULL,
  location_description VARCHAR(255) NOT NULL DEFAULT '',
  arrest TINYINT(1) NOT NULL,
  domestic TINYINT(1) NOT NULL,
  crime_count INT UNSIGNED NOT NULL DEFAULT 0,
  KEY idx_summary_year (year),
  KEY idx_summary_year_month (year, month),
  KEY idx_summary_year_type (year, primary_type),
  KEY idx_summary_year_district (year, district),
  KEY idx_summary_year_dow (year, day_of_week),
  KEY idx_summary_year_hour (year, hour),
  KEY idx_summary_type_arrest (year, primary_type, arrest),
  KEY idx_summary_year_domestic (year, domestic)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================
-- Step 4: Populate the summary table
-- ============================================================
INSERT INTO crimes_summary (year, month, day_of_week, hour, primary_type, district, location_description, arrest, domestic, crime_count)
SELECT
  c.year,
  MONTH(c.date),
  DAYOFWEEK(c.date),
  HOUR(c.date),
  COALESCE(c.primary_type, ''),
  COALESCE(c.district, ''),
  COALESCE(c.location_description, ''),
  COALESCE(c.arrest, 0),
  COALESCE(c.domestic, 0),
  COUNT(*) AS crime_count
FROM crimes c
WHERE c.year IS NOT NULL AND c.date IS NOT NULL
GROUP BY
  c.year,
  MONTH(c.date),
  DAYOFWEEK(c.date),
  HOUR(c.date),
  c.primary_type,
  c.district,
  c.location_description,
  c.arrest,
  c.domestic;

SELECT CONCAT('crimes_summary populated: ', COUNT(*), ' rows') AS status FROM crimes_summary;
