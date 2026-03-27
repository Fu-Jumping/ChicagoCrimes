-- Usage:
--   mysql -h 127.0.0.1 -P 3306 -u school_app -p school_chicago_crime < backend/sql/rebuild_layered_summaries.sql
--
-- Rebuilds the layered summary tables used by the backend performance architecture:
-- - crimes_summary
-- - crimes_filter_summary
-- - crimes_location_summary
-- - crimes_daily_summary

DROP TABLE IF EXISTS crimes_daily_summary;
DROP TABLE IF EXISTS crimes_location_summary;
DROP TABLE IF EXISTS crimes_filter_summary;
DROP TABLE IF EXISTS crimes_summary;

CREATE TABLE crimes_summary (
  id INT AUTO_INCREMENT PRIMARY KEY,
  year SMALLINT UNSIGNED NOT NULL,
  month TINYINT UNSIGNED NOT NULL,
  primary_type VARCHAR(100) NOT NULL,
  district VARCHAR(10) NOT NULL,
  arrest TINYINT(1) NOT NULL,
  domestic TINYINT(1) NOT NULL,
  crime_count INT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uq_crimes_summary_dimensions (year, month, primary_type, district, arrest, domestic),
  KEY idx_summary_year (year),
  KEY idx_summary_year_month (year, month),
  KEY idx_summary_year_type (year, primary_type),
  KEY idx_summary_year_district (year, district),
  KEY idx_summary_year_arrest (year, arrest),
  KEY idx_summary_year_domestic (year, domestic)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO crimes_summary (
  year,
  month,
  primary_type,
  district,
  arrest,
  domestic,
  crime_count
)
SELECT
  c.year,
  MONTH(c.date) AS month,
  COALESCE(c.primary_type, ''),
  COALESCE(c.district, ''),
  COALESCE(c.arrest, 0),
  COALESCE(c.domestic, 0),
  COUNT(*) AS crime_count
FROM crimes c
WHERE c.year IS NOT NULL
  AND c.date IS NOT NULL
GROUP BY
  c.year,
  MONTH(c.date),
  COALESCE(c.primary_type, ''),
  COALESCE(c.district, ''),
  COALESCE(c.arrest, 0),
  COALESCE(c.domestic, 0);

CREATE TABLE crimes_filter_summary (
  id INT AUTO_INCREMENT PRIMARY KEY,
  year SMALLINT UNSIGNED NOT NULL,
  month TINYINT UNSIGNED NOT NULL,
  primary_type VARCHAR(100) NOT NULL,
  district VARCHAR(10) NOT NULL,
  beat VARCHAR(10) NULL,
  ward INT NULL,
  community_area INT NULL,
  arrest TINYINT(1) NOT NULL,
  domestic TINYINT(1) NOT NULL,
  crime_count INT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uq_crimes_filter_summary_dimensions (
    year,
    month,
    primary_type,
    district,
    beat,
    ward,
    community_area,
    arrest,
    domestic
  ),
  KEY idx_filter_summary_year_month (year, month),
  KEY idx_filter_summary_year_type (year, primary_type),
  KEY idx_filter_summary_year_district (year, district),
  KEY idx_filter_summary_year_beat (year, beat),
  KEY idx_filter_summary_year_ward (year, ward),
  KEY idx_filter_summary_year_community (year, community_area),
  KEY idx_filter_summary_year_arrest (year, arrest),
  KEY idx_filter_summary_year_domestic (year, domestic),
  KEY idx_filter_summary_agg_ward_domestic_year_month (ward, domestic, year, month),
  KEY idx_filter_summary_agg_beat_domestic_year_month (beat, domestic, year, month),
  KEY idx_filter_summary_agg_community_domestic_year_month (community_area, domestic, year, month),
  KEY idx_filter_summary_agg_ward_arrest_year_month (ward, arrest, year, month),
  KEY idx_filter_summary_agg_beat_arrest_year_month (beat, arrest, year, month),
  KEY idx_filter_summary_agg_community_arrest_year_month (community_area, arrest, year, month),
  KEY idx_filter_summary_lookup_beat (year, ward, domestic, beat),
  KEY idx_filter_summary_lookup_ward (year, beat, domestic, ward),
  KEY idx_filter_summary_lookup_community (year, beat, ward, domestic, community_area)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO crimes_filter_summary (
  year,
  month,
  primary_type,
  district,
  beat,
  ward,
  community_area,
  arrest,
  domestic,
  crime_count
)
SELECT
  c.year,
  MONTH(c.date) AS month,
  COALESCE(c.primary_type, ''),
  COALESCE(c.district, ''),
  NULLIF(TRIM(c.beat), ''),
  c.ward,
  c.community_area,
  COALESCE(c.arrest, 0),
  COALESCE(c.domestic, 0),
  COUNT(*) AS crime_count
FROM crimes c
WHERE c.year IS NOT NULL
  AND c.date IS NOT NULL
GROUP BY
  c.year,
  MONTH(c.date),
  COALESCE(c.primary_type, ''),
  COALESCE(c.district, ''),
  NULLIF(TRIM(c.beat), ''),
  c.ward,
  c.community_area,
  COALESCE(c.arrest, 0),
  COALESCE(c.domestic, 0);

CREATE TABLE crimes_location_summary (
  id INT AUTO_INCREMENT PRIMARY KEY,
  year SMALLINT UNSIGNED NOT NULL,
  month TINYINT UNSIGNED NOT NULL,
  primary_type VARCHAR(100) NOT NULL,
  district VARCHAR(10) NOT NULL,
  location_description VARCHAR(255) NOT NULL DEFAULT '',
  arrest TINYINT(1) NOT NULL,
  domestic TINYINT(1) NOT NULL,
  crime_count INT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uq_crimes_location_summary_dimensions (
    year,
    month,
    primary_type,
    district,
    location_description,
    arrest,
    domestic
  ),
  KEY idx_location_summary_year_month (year, month),
  KEY idx_location_summary_year_type (year, primary_type),
  KEY idx_location_summary_year_district (year, district),
  KEY idx_location_summary_year_location (year, location_description),
  KEY idx_location_summary_type_location (year, primary_type, location_description),
  KEY idx_location_summary_year_arrest (year, arrest),
  KEY idx_location_summary_year_domestic (year, domestic)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO crimes_location_summary (
  year,
  month,
  primary_type,
  district,
  location_description,
  arrest,
  domestic,
  crime_count
)
SELECT
  c.year,
  MONTH(c.date) AS month,
  COALESCE(c.primary_type, ''),
  COALESCE(c.district, ''),
  COALESCE(c.location_description, ''),
  COALESCE(c.arrest, 0),
  COALESCE(c.domestic, 0),
  COUNT(*) AS crime_count
FROM crimes c
WHERE c.year IS NOT NULL
  AND c.date IS NOT NULL
GROUP BY
  c.year,
  MONTH(c.date),
  COALESCE(c.primary_type, ''),
  COALESCE(c.district, ''),
  COALESCE(c.location_description, ''),
  COALESCE(c.arrest, 0),
  COALESCE(c.domestic, 0);

CREATE TABLE crimes_daily_summary (
  id INT AUTO_INCREMENT PRIMARY KEY,
  crime_date DATE NOT NULL,
  crime_year SMALLINT UNSIGNED NOT NULL,
  crime_month TINYINT UNSIGNED NOT NULL,
  primary_type VARCHAR(100) NOT NULL,
  district VARCHAR(10) NOT NULL,
  arrest TINYINT(1) NOT NULL,
  domestic TINYINT(1) NOT NULL,
  crime_count INT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uq_crimes_daily_summary_dimensions (
    crime_date,
    primary_type,
    district,
    arrest,
    domestic
  ),
  KEY idx_daily_summary_date (crime_date),
  KEY idx_daily_summary_year_month (crime_year, crime_month),
  KEY idx_daily_summary_date_type (crime_date, primary_type),
  KEY idx_daily_summary_date_district (crime_date, district),
  KEY idx_daily_summary_date_arrest (crime_date, arrest),
  KEY idx_daily_summary_date_domestic (crime_date, domestic)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO crimes_daily_summary (
  crime_date,
  crime_year,
  crime_month,
  primary_type,
  district,
  arrest,
  domestic,
  crime_count
)
SELECT
  DATE(c.date) AS crime_date,
  YEAR(c.date) AS crime_year,
  MONTH(c.date) AS crime_month,
  COALESCE(c.primary_type, ''),
  COALESCE(c.district, ''),
  COALESCE(c.arrest, 0),
  COALESCE(c.domestic, 0),
  COUNT(*) AS crime_count
FROM crimes c
WHERE c.date IS NOT NULL
GROUP BY
  DATE(c.date),
  YEAR(c.date),
  MONTH(c.date),
  COALESCE(c.primary_type, ''),
  COALESCE(c.district, ''),
  COALESCE(c.arrest, 0),
  COALESCE(c.domestic, 0);

ANALYZE TABLE crimes_summary;
ANALYZE TABLE crimes_filter_summary;
ANALYZE TABLE crimes_location_summary;
ANALYZE TABLE crimes_daily_summary;

SELECT CONCAT('crimes_summary rows: ', COUNT(*)) AS status FROM crimes_summary;
SELECT CONCAT('crimes_filter_summary rows: ', COUNT(*)) AS status FROM crimes_filter_summary;
SELECT CONCAT('crimes_location_summary rows: ', COUNT(*)) AS status FROM crimes_location_summary;
SELECT CONCAT('crimes_daily_summary rows: ', COUNT(*)) AS status FROM crimes_daily_summary;
