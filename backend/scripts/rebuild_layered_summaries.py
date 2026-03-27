from __future__ import annotations

from pathlib import Path
import sys

from sqlalchemy import inspect

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.database import engine

RAW_HEATMAP_INDEX_STATEMENTS = {
    "idx_geo_year_month_lat_lng": "CREATE INDEX idx_geo_year_month_lat_lng ON crimes (year, crime_month, lat_round3, lng_round3)",
    "idx_geo_year_ward_lat_lng": "CREATE INDEX idx_geo_year_ward_lat_lng ON crimes (year, ward, lat_round3, lng_round3)",
    "idx_geo_year_beat_lat_lng": "CREATE INDEX idx_geo_year_beat_lat_lng ON crimes (year, beat, lat_round3, lng_round3)",
    "idx_geo_year_community_lat_lng": "CREATE INDEX idx_geo_year_community_lat_lng ON crimes (year, community_area, lat_round3, lng_round3)",
    "idx_geo_year_district_lat_lng": "CREATE INDEX idx_geo_year_district_lat_lng ON crimes (year, district, lat_round3, lng_round3)",
}


def load_sql_statements(sql_path: Path) -> list[str]:
    statements: list[str] = []
    current_lines: list[str] = []

    for raw_line in sql_path.read_text(encoding="utf-8").splitlines():
        stripped = raw_line.strip()
        if not stripped or stripped.startswith("--"):
            continue
        current_lines.append(raw_line)
        if stripped.endswith(";"):
            statement = "\n".join(current_lines).strip()
            statements.append(statement[:-1].strip())
            current_lines = []

    if current_lines:
        statements.append("\n".join(current_lines).strip())

    return [statement for statement in statements if statement]


def ensure_raw_heatmap_indexes() -> None:
    inspector = inspect(engine)
    existing_indexes = {index["name"] for index in inspector.get_indexes("crimes")}
    missing_indexes = [
        (name, sql)
        for name, sql in RAW_HEATMAP_INDEX_STATEMENTS.items()
        if name not in existing_indexes
    ]

    if not missing_indexes:
        print("All raw heatmap indexes already exist.")
        return

    print(f"Creating {len(missing_indexes)} missing raw heatmap indexes...")
    with engine.begin() as conn:
        for name, statement in missing_indexes:
            conn.exec_driver_sql(statement)
            print(f"Created index: {name}")


def main() -> None:
    sql_path = ROOT_DIR / "sql" / "rebuild_layered_summaries.sql"
    statements = load_sql_statements(sql_path)
    if not statements:
        raise RuntimeError(f"No SQL statements found in {sql_path}")

    ensure_raw_heatmap_indexes()
    print(f"Executing {len(statements)} statements from {sql_path.name}...")
    with engine.begin() as conn:
        for index, statement in enumerate(statements, start=1):
            result = conn.exec_driver_sql(statement)
            prefix = f"[{index}/{len(statements)}]"
            if result.returns_rows:
                rows = result.fetchall()
                if rows:
                    print(f"{prefix} {rows[0][0]}")
                else:
                    print(f"{prefix} completed with result rows")
            else:
                print(f"{prefix} completed")

    print("Layered summaries rebuilt.")


if __name__ == "__main__":
    main()
