-- Usage (MySQL client, run at repo root):
--   mysql --local-infile=1 -h 127.0.0.1 -P 3306 -u school_app -p"YOUR_PASS" school_chicago_crime
--   mysql> SOURCE backend/sql/import_kaggle_crimes.sql;
--
-- Notes:
-- - Requires: `SET GLOBAL local_infile=1;` and client `--local-infile=1`
-- - This script imports the full CSV at `data/Crimes_-_2001_to_Present.csv`

SET @date_fmt_primary = '%m/%d/%Y %h:%i:%s %p';
SET @date_fmt_iso = '%Y-%m-%d %H:%i:%s';
SET @date_fmt_iso_ms = '%Y-%m-%dT%H:%i:%s.%f';

LOAD DATA LOCAL INFILE 'data/Crimes_-_2001_to_Present.csv'
INTO TABLE crimes
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' ESCAPED BY '\\'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(
  @id,
  @case_number,
  @date_raw,
  @block,
  @iucr,
  @primary_type,
  @description,
  @location_description,
  @arrest_raw,
  @domestic_raw,
  @beat,
  @district,
  @ward,
  @community_area,
  @fbi_code,
  @x_coordinate,
  @y_coordinate,
  @year,
  @updated_on_raw,
  @latitude,
  @longitude,
  @location
)
SET
  id = NULLIF(@id, ''),
  case_number = NULLIF(@case_number, ''),
  date = COALESCE(
    STR_TO_DATE(NULLIF(@date_raw, ''), @date_fmt_primary),
    STR_TO_DATE(NULLIF(@date_raw, ''), @date_fmt_iso),
    STR_TO_DATE(NULLIF(@date_raw, ''), @date_fmt_iso_ms)
  ),
  block = NULLIF(@block, ''),
  iucr = NULLIF(@iucr, ''),
  primary_type = NULLIF(@primary_type, ''),
  description = NULLIF(@description, ''),
  location_description = NULLIF(@location_description, ''),
  arrest = CASE
    WHEN @arrest_raw IS NULL OR TRIM(@arrest_raw) = '' THEN NULL
    WHEN LOWER(TRIM(@arrest_raw)) IN ('true', 't', '1', 'yes', 'y') THEN 1
    WHEN LOWER(TRIM(@arrest_raw)) IN ('false', 'f', '0', 'no', 'n') THEN 0
    ELSE NULL
  END,
  domestic = CASE
    WHEN @domestic_raw IS NULL OR TRIM(@domestic_raw) = '' THEN NULL
    WHEN LOWER(TRIM(@domestic_raw)) IN ('true', 't', '1', 'yes', 'y') THEN 1
    WHEN LOWER(TRIM(@domestic_raw)) IN ('false', 'f', '0', 'no', 'n') THEN 0
    ELSE NULL
  END,
  beat = NULLIF(@beat, ''),
  district = NULLIF(@district, ''),
  ward = NULLIF(@ward, ''),
  community_area = NULLIF(@community_area, ''),
  fbi_code = NULLIF(@fbi_code, ''),
  x_coordinate = NULLIF(@x_coordinate, ''),
  y_coordinate = NULLIF(@y_coordinate, ''),
  year = NULLIF(@year, ''),
  updated_on = COALESCE(
    STR_TO_DATE(NULLIF(@updated_on_raw, ''), @date_fmt_primary),
    STR_TO_DATE(NULLIF(@updated_on_raw, ''), @date_fmt_iso),
    STR_TO_DATE(NULLIF(@updated_on_raw, ''), @date_fmt_iso_ms)
  ),
  latitude = NULLIF(@latitude, ''),
  longitude = NULLIF(@longitude, ''),
  location = NULLIF(TRIM(TRAILING '\r' FROM @location), '');

