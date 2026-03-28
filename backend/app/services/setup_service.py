"""First-run setup: MySQL checks, schema, CSV import, summaries (used by /api/setup)."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import queue
import re
import shutil
import socket
import subprocess
import threading
import time
from collections.abc import AsyncIterator, Callable, Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pymysql
from pymysql.cursors import DictCursor
from sqlalchemy import inspect, text

import sys as _sys

from app.config.env_file import merge_env_file, repo_root
import app.database as _db
from app.models import crime as _crime  # noqa: F401
from app.services.analytics import reset_summary_capabilities_cache

ROOT = repo_root()
LOG_DIR = ROOT / "logs"
SETUP_LOG = LOG_DIR / "setup.log"

# In PyInstaller bundle, SQL files are extracted to sys._MEIPASS/sql/.
# In development, they live under backend/sql/.
if getattr(_sys, "frozen", False):
    BACKEND_DIR = Path(_sys._MEIPASS)  # type: ignore[attr-defined]
else:
    BACKEND_DIR = ROOT / "backend"

_raw_heatmap_index_statements: dict[str, str] = {
    "idx_geo_year_month_lat_lng": (
        "CREATE INDEX idx_geo_year_month_lat_lng ON crimes (year, crime_month, lat_round3, lng_round3)"
    ),
    "idx_geo_year_ward_lat_lng": (
        "CREATE INDEX idx_geo_year_ward_lat_lng ON crimes (year, ward, lat_round3, lng_round3)"
    ),
    "idx_geo_year_beat_lat_lng": (
        "CREATE INDEX idx_geo_year_beat_lat_lng ON crimes (year, beat, lat_round3, lng_round3)"
    ),
    "idx_geo_year_community_lat_lng": (
        "CREATE INDEX idx_geo_year_community_lat_lng ON crimes (year, community_area, lat_round3, lng_round3)"
    ),
    "idx_geo_year_district_lat_lng": (
        "CREATE INDEX idx_geo_year_district_lat_lng ON crimes (year, district, lat_round3, lng_round3)"
    ),
}

_performance_indexes: list[str] = [
    "CREATE INDEX idx_year_type ON crimes (year, primary_type)",
    "CREATE INDEX idx_year_month ON crimes (year, crime_month)",
    "CREATE INDEX idx_year_dow ON crimes (year, crime_dow)",
    "CREATE INDEX idx_year_hour ON crimes (year, crime_hour)",
    "CREATE INDEX idx_year_type_id ON crimes (year, primary_type, id)",
    "CREATE INDEX idx_year_type_district ON crimes (year, primary_type, district)",
    "CREATE INDEX idx_year_arrest ON crimes (year, arrest)",
    "CREATE INDEX idx_year_domestic ON crimes (year, domestic)",
    "CREATE INDEX idx_year_type_location ON crimes (year, primary_type, location_description)",
    "CREATE INDEX idx_year_lat_lng ON crimes (year, lat_round3, lng_round3)",
]

_derived_columns_to_replace: tuple[str, ...] = (
    "crime_month",
    "crime_dow",
    "crime_hour",
    "lat_round3",
    "lng_round3",
)


def _ensure_setup_logger() -> logging.Logger:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    log = logging.getLogger("chicago_crime_setup")
    if log.handlers:
        return log
    log.setLevel(logging.INFO)
    fh = logging.FileHandler(SETUP_LOG, encoding="utf-8")
    fh.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    log.addHandler(fh)
    return log


log = _ensure_setup_logger()


@dataclass(frozen=True)
class DbConnParams:
    host: str
    port: int
    user: str
    password: str
    database: str

    def pymysql_kwargs(self, *, database: str | None = None) -> dict[str, Any]:
        return {
            "host": self.host,
            "port": self.port,
            "user": self.user,
            "password": self.password,
            "database": database if database is not None else self.database,
            "charset": "utf8mb4",
            "cursorclass": DictCursor,
        }


def check_mysql_cli_installed() -> tuple[bool, str | None]:
    mysql_path = shutil.which("mysql")
    if not mysql_path:
        return False, None
    try:
        proc = subprocess.run(
            [mysql_path, "--version"],
            capture_output=True,
            text=True,
            timeout=10,
            check=False,
        )
        out = (proc.stdout or proc.stderr or "").strip()
        return True, out or mysql_path
    except Exception as exc:
        return True, f"mysql found but version check failed: {exc}"


def check_tcp_port_open(host: str, port: int, timeout: float = 3.0) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def test_mysql_connection(params: DbConnParams, *, database: str | None = None) -> tuple[bool, str | None]:
    db = database if database is not None else params.database
    try:
        conn = pymysql.connect(
            host=params.host,
            port=params.port,
            user=params.user,
            password=params.password,
            database=db,
            connect_timeout=8,
        )
        conn.close()
        return True, None
    except Exception as exc:
        return False, str(exc)


def database_exists(params: DbConnParams, name: str) -> bool:
    try:
        conn = pymysql.connect(
            host=params.host,
            port=params.port,
            user=params.user,
            password=params.password,
            database="information_schema",
            connect_timeout=8,
        )
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT SCHEMA_NAME FROM SCHEMATA WHERE SCHEMA_NAME = %s",
                    (name,),
                )
                return cur.fetchone() is not None
        finally:
            conn.close()
    except Exception:
        return False


def create_database(params: DbConnParams, name: str) -> None:
    conn = pymysql.connect(
        host=params.host,
        port=params.port,
        user=params.user,
        password=params.password,
        connect_timeout=8,
    )
    try:
        with conn.cursor() as cur:
            safe_name = _sanitize_identifier(name)
            cur.execute(f"CREATE DATABASE IF NOT EXISTS `{safe_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci")
        conn.commit()
    finally:
        conn.close()


def _sanitize_identifier(name: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9_]+", name):
        raise ValueError("Invalid database name")
    return name


def validate_config_for_save(host: str, port: int, user: str, password: str, database: str) -> None:
    """Same safety rules as runtime ``database.py`` (raises RuntimeError)."""
    os.environ["MYSQL_HOST"] = host.strip()
    os.environ["MYSQL_PORT"] = str(port)
    os.environ["MYSQL_USER"] = user.strip()
    os.environ["MYSQL_PASSWORD"] = password
    os.environ["MYSQL_DATABASE"] = database.strip()
    _db.validate_database_runtime_settings()


def save_database_config_to_env(host: str, port: int, user: str, password: str, database: str) -> None:
    validate_config_for_save(host, port, user, password, database)
    merge_env_file(
        {
            "MYSQL_HOST": host.strip(),
            "MYSQL_PORT": str(int(port)),
            "MYSQL_USER": user.strip(),
            "MYSQL_PASSWORD": password,
            "MYSQL_DATABASE": database.strip(),
        }
    )
    _db.reload_engine_from_env()
    reset_summary_capabilities_cache()


def init_schema_orm() -> None:
    if _db.engine is None:
        raise RuntimeError("Database engine not configured")
    import app.models.crime  # noqa: F401

    _db.Base.metadata.create_all(bind=_db.engine)


def count_csv_lines(path: Path, on_progress: Callable[[int], None] | None = None) -> int:
    """Count newline-terminated lines (for progress estimate). Large files: may take minutes."""
    n = 0
    block = 1024 * 1024
    with path.open("rb") as f:
        while True:
            chunk = f.read(block)
            if not chunk:
                break
            n += chunk.count(b"\n")
            if on_progress:
                on_progress(n)
    return max(0, n - 1)  # header


def _split_mysql_script(sql: str) -> list[str]:
    statements: list[str] = []
    buf: list[str] = []
    for line in sql.splitlines():
        buf.append(line)
        if line.strip().endswith(";"):
            stmt = "\n".join(buf).strip()
            if stmt.endswith(";"):
                stmt = stmt[:-1].strip()
            if stmt:
                statements.append(stmt)
            buf = []
    if buf:
        tail = "\n".join(buf).strip()
        if tail.endswith(";"):
            tail = tail[:-1].strip()
        if tail:
            statements.append(tail)
    return statements


def _load_data_sql(csv_posix_path: str) -> str:
    # Same transforms as backend/sql/import_kaggle_crimes.sql
    return f"""
SET @date_fmt_primary = '%m/%d/%Y %h:%i:%s %p';
SET @date_fmt_iso = '%Y-%m-%d %H:%i:%s';
SET @date_fmt_iso_ms = '%Y-%m-%dT%H:%i:%s.%f';

LOAD DATA LOCAL INFILE '{csv_posix_path.replace("'", "''")}'
INTO TABLE crimes
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' ESCAPED BY '\\\\'
LINES TERMINATED BY '\\n'
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
  location = NULLIF(TRIM(TRAILING '\\r' FROM @location), '');
"""


def _humanize_mysql_error(exc: Exception) -> str:
    """Translate common MySQL errors into actionable Chinese hints."""
    msg = str(exc)
    code = getattr(exc, "args", (None,))[0] if hasattr(exc, "args") else None

    if code == 3948 or code == 1148 or "local data is disabled" in msg.lower() or "not allowed" in msg.lower():
        return (
            "MySQL 服务端禁止了 LOCAL INFILE 导入。\n"
            "请用 root 账户在 MySQL 中执行：SET GLOBAL local_infile=1;\n"
            "或在 my.ini / my.cnf 的 [mysqld] 段添加 local_infile=1 后重启服务。"
        )
    if code == 1045 or "Access denied" in msg:
        return f"MySQL 拒绝访问，请检查用户名和密码是否正确。\n原始错误: {msg}"
    if code == 1049 or "Unknown database" in msg:
        return f"数据库不存在，请先回到上一步创建数据库。\n原始错误: {msg}"
    if code == 1146 or "doesn't exist" in msg:
        return f"数据表不存在，请先回到上一步执行「保存配置+创建表结构」。\n原始错误: {msg}"
    if "Lost connection" in msg or "gone away" in msg.lower():
        return f"与 MySQL 的连接断开，可能是导入超时。请检查 MySQL 的 max_allowed_packet 和 wait_timeout 配置。\n原始错误: {msg}"
    return msg


def import_csv_worker(
    params: DbConnParams,
    csv_path: Path,
    *,
    truncate_first: bool,
    progress_q: queue.Queue,
) -> None:
    try:
        csv_path = csv_path.resolve()
        if not csv_path.is_file():
            progress_q.put({"phase": "error", "message": f"文件不存在: {csv_path}\n请回到上一步重新选择 CSV 文件。"})
            return

        progress_q.put({"phase": "counting_lines", "message": "正在统计 CSV 行数（大文件可能需数分钟）…"})

        def on_line_progress(lines: int) -> None:
            progress_q.put({"phase": "counting_lines", "lines_scanned": lines})

        total_lines = count_csv_lines(csv_path, on_line_progress)
        progress_q.put({"phase": "line_count_done", "estimated_rows": total_lines})

        def run_import() -> None:
            conn = pymysql.connect(
                host=params.host,
                port=params.port,
                user=params.user,
                password=params.password,
                database=params.database,
                local_infile=True,
                connect_timeout=60,
            )
            try:
                conn.autocommit(True)
                with conn.cursor() as cur:
                    try:
                        cur.execute("SET GLOBAL local_infile=1")
                        progress_q.put({"phase": "info", "message": "已自动开启 MySQL local_infile"})
                    except Exception:
                        progress_q.put({
                            "phase": "warning",
                            "message": "无法自动开启 local_infile（权限不足），若导入失败请手动执行: SET GLOBAL local_infile=1"
                        })
                    if truncate_first:
                        progress_q.put({"phase": "truncate", "message": "清空 crimes 表…"})
                        cur.execute("SET FOREIGN_KEY_CHECKS=0")
                        cur.execute("TRUNCATE TABLE crimes")
                        cur.execute("SET FOREIGN_KEY_CHECKS=1")
                    sql_script = _load_data_sql(csv_path.as_posix())
                    progress_q.put({
                        "phase": "load_data",
                        "message": "LOAD DATA LOCAL INFILE 导入中… 此阶段进度条可能长时间停在 0%，属正常现象，请耐心等待。"
                    })
                    for stmt in _split_mysql_script(sql_script):
                        cur.execute(stmt)
            finally:
                conn.close()

        stop = threading.Event()

        def poll_count() -> None:
            try:
                while not stop.is_set():
                    time.sleep(2.0)
                    try:
                        cconn = pymysql.connect(
                            host=params.host,
                            port=params.port,
                            user=params.user,
                            password=params.password,
                            database=params.database,
                            connect_timeout=10,
                        )
                        try:
                            with cconn.cursor() as ccur:
                                ccur.execute("SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED")
                                ccur.execute("SELECT COUNT(*) AS c FROM crimes")
                                row = ccur.fetchone()
                                cnt = int(row[0]) if row else 0
                            pct = min(99.0, (cnt / total_lines) * 100) if total_lines > 0 else None
                            progress_q.put(
                                {
                                    "phase": "import_progress",
                                    "rows_imported": cnt,
                                    "estimated_total": total_lines,
                                    "percent": pct,
                                }
                            )
                        finally:
                            cconn.close()
                    except Exception:
                        pass
            except Exception:
                pass

        poll_thread = threading.Thread(target=poll_count, daemon=True)
        poll_thread.start()
        try:
            run_import()
        finally:
            stop.set()
            poll_thread.join(timeout=1.0)

        conn = pymysql.connect(
            host=params.host,
            port=params.port,
            user=params.user,
            password=params.password,
            database=params.database,
            connect_timeout=30,
        )
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM crimes")
                final = int(cur.fetchone()[0])
        finally:
            conn.close()

        progress_q.put({"phase": "import_done", "rows_imported": final, "estimated_total": total_lines})
        log.info("import_csv_done rows=%s", final)
    except Exception as exc:
        log.exception("import_csv_failed")
        progress_q.put({"phase": "error", "message": _humanize_mysql_error(exc)})


def _crimes_generated_columns_ready(conn) -> bool:
    rows = conn.execute(
        text(
            """
            SELECT COLUMN_NAME, EXTRA
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'crimes'
              AND COLUMN_NAME IN ('crime_month','crime_dow','crime_hour','lat_round3','lng_round3')
            """
        )
    ).fetchall()
    if len(rows) < 5:
        return False
    for row in rows:
        extra = row[1] if len(row) > 1 else None
        ex = (extra or "").upper()
        if "GENERATED" not in ex:
            return False
    return True


def upgrade_crimes_derived_columns() -> Iterator[dict[str, Any]]:
    if _db.engine is None:
        raise RuntimeError("Database engine not configured")
    insp = inspect(_db.engine)
    if not insp.has_table("crimes"):
        yield {"step": "skip", "message": "crimes 表不存在"}
        return
    existing = {c["name"] for c in insp.get_columns("crimes")}
    yield {"step": "analyze", "message": "检查 crimes 派生列…", "existing_columns": sorted(existing)}

    with _db.engine.connect() as chk:
        already_generated = _crimes_generated_columns_ready(chk)
    if already_generated:
        yield {"step": "generated_skip", "message": "生成列已存在，跳过迁移"}
        return

    to_drop = [c for c in _derived_columns_to_replace if c in existing]
    if to_drop:
        ddl = ", ".join(f"DROP COLUMN `{c}`" for c in to_drop)
        yield {"step": "drop_plain", "message": f"移除 ORM 占位列: {to_drop}"}
        with _db.engine.begin() as conn:
            conn.exec_driver_sql(f"ALTER TABLE crimes {ddl}")

    yield {"step": "add_generated", "message": "添加 STORED 生成列（crime_month 等）…"}
    alter_generated = """
    ALTER TABLE crimes
      ADD COLUMN crime_month TINYINT UNSIGNED
        GENERATED ALWAYS AS (MONTH(`date`)) STORED AFTER `year`,
      ADD COLUMN crime_dow TINYINT UNSIGNED
        GENERATED ALWAYS AS (DAYOFWEEK(`date`)) STORED AFTER `crime_month`,
      ADD COLUMN crime_hour TINYINT UNSIGNED
        GENERATED ALWAYS AS (HOUR(`date`)) STORED AFTER `crime_dow`,
      ADD COLUMN lat_round3 DOUBLE
        GENERATED ALWAYS AS (ROUND(latitude, 3)) STORED AFTER `longitude`,
      ADD COLUMN lng_round3 DOUBLE
        GENERATED ALWAYS AS (ROUND(longitude, 3)) STORED AFTER `lat_round3`
    """
    with _db.engine.begin() as conn:
        conn.exec_driver_sql(alter_generated)
    yield {"step": "generated_done", "message": "生成列已就绪"}


def ensure_performance_indexes() -> Iterator[dict[str, Any]]:
    if _db.engine is None:
        raise RuntimeError("Database engine not configured")
    insp = inspect(_db.engine)
    existing = {ix["name"] for ix in insp.get_indexes("crimes")}
    for i, stmt in enumerate(_performance_indexes, start=1):
        name_match = re.search(r"INDEX\s+(\w+)", stmt)
        iname = name_match.group(1) if name_match else f"idx_{i}"
        if iname in existing:
            yield {"step": "index_skip", "index": iname, "message": f"索引已存在 {iname}"}
            continue
        yield {"step": "index_create", "index": iname, "message": f"创建索引 {iname}…"}
        with _db.engine.begin() as conn:
            conn.exec_driver_sql(stmt)
        existing.add(iname)


def ensure_raw_heatmap_indexes() -> Iterator[dict[str, Any]]:
    if _db.engine is None:
        raise RuntimeError("Database engine not configured")
    insp = inspect(_db.engine)
    existing = {ix["name"] for ix in insp.get_indexes("crimes")}
    for name, stmt in _raw_heatmap_index_statements.items():
        if name in existing:
            yield {"step": "heatmap_index_skip", "index": name}
            continue
        yield {"step": "heatmap_index_create", "index": name, "message": f"创建 {name}…"}
        with _db.engine.begin() as conn:
            conn.exec_driver_sql(stmt)
        existing.add(name)


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
    return [s for s in statements if s]


def rebuild_layered_summaries_stream() -> Iterator[dict[str, Any]]:
    if _db.engine is None:
        raise RuntimeError("Database engine not configured")
    sql_path = BACKEND_DIR / "sql" / "rebuild_layered_summaries.sql"
    statements = load_sql_statements(sql_path)
    if not statements:
        raise RuntimeError(f"No SQL in {sql_path}")
    yield {"step": "summaries_start", "total": len(statements), "message": "重建汇总表…"}
    for index, statement in enumerate(statements, start=1):
        yield {
            "step": "summary_sql",
            "current": index,
            "total": len(statements),
            "preview": statement[:120] + ("…" if len(statement) > 120 else ""),
        }
        with _db.engine.begin() as conn:
            conn.exec_driver_sql(statement)
    yield {"step": "summaries_done", "message": "汇总表重建完成"}


def setup_status_from_db() -> dict[str, Any]:
    if _db.engine is None:
        return {
            "database_configured": False,
            "tables_ok": False,
            "crimes_populated": False,
            "summaries_ready": False,
            "percent": 0,
        }
    try:
        insp = inspect(_db.engine)
        has_crimes = insp.has_table("crimes")
        row_count = 0
        if has_crimes:
            with _db.engine.connect() as conn:
                row_count = conn.execute(text("SELECT COUNT(*) FROM crimes")).scalar() or 0
        summaries = all(
            insp.has_table(t)
            for t in (
                "crimes_summary",
                "crimes_filter_summary",
                "crimes_location_summary",
                "crimes_daily_summary",
            )
        )
        percent = 0
        if has_crimes:
            percent = 25
        if row_count > 0:
            percent = 60
        if summaries and row_count > 0:
            percent = 100
        elif summaries:
            percent = 85
        return {
            "database_configured": True,
            "tables_ok": has_crimes,
            "crimes_populated": row_count > 0,
            "crimes_row_count": row_count,
            "summaries_ready": summaries,
            "percent": percent,
        }
    except Exception as exc:
        log.warning("setup_status_failed %s", exc)
        return {
            "database_configured": True,
            "tables_ok": False,
            "crimes_populated": False,
            "summaries_ready": False,
            "percent": 0,
            "error": str(exc),
        }


async def stream_queue_events(q: queue.Queue, *, idle_sleep: float = 0.15) -> AsyncIterator[bytes]:
    while True:
        try:
            item = q.get_nowait()
        except queue.Empty:
            await asyncio.sleep(idle_sleep)
            continue
        if item is None:
            break
        yield f"data: {json.dumps(item, ensure_ascii=False)}\n\n".encode("utf-8")


def run_import_with_queue(
    params: DbConnParams,
    csv_path: Path,
    *,
    truncate_first: bool,
    q: queue.Queue,
) -> None:
    import_csv_worker(params, csv_path, truncate_first=truncate_first, progress_q=q)
    q.put(None)


def build_all_summaries_with_queue(q: queue.Queue) -> None:
    try:
        for ev in upgrade_crimes_derived_columns():
            q.put(ev)
        for ev in ensure_performance_indexes():
            q.put(ev)
        for ev in rebuild_layered_summaries_stream():
            q.put(ev)
        for ev in ensure_raw_heatmap_indexes():
            q.put(ev)
        q.put({"phase": "build_done", "message": "索引与汇总表构建完成"})
        reset_summary_capabilities_cache()
        log.info("build_summaries_done")
    except Exception as exc:
        log.exception("build_summaries_failed")
        q.put({"phase": "error", "message": _humanize_mysql_error(exc)})
    finally:
        q.put(None)
