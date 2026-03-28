"""First-run setup wizard HTTP API."""

from __future__ import annotations

import queue
import threading
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from starlette.responses import StreamingResponse

import app.database as _db
from app.services import setup_service as ss

router = APIRouter(prefix="/api/setup", tags=["setup"])


class DatabaseConfigBody(BaseModel):
    host: str = Field(default="127.0.0.1", min_length=1)
    port: int = Field(default=3306, ge=1, le=65535)
    user: str = Field(min_length=1)
    password: str = Field(default="")
    database: str = Field(min_length=1)


class CheckMysqlBody(BaseModel):
    host: str = Field(default="127.0.0.1")
    port: int = Field(default=3306, ge=1, le=65535)


class CreateDatabaseBody(DatabaseConfigBody):
    pass


class SaveConfigBody(DatabaseConfigBody):
    pass


class ImportCsvBody(BaseModel):
    csv_path: str = Field(min_length=1)
    truncate_first: bool = True


def _params(body: DatabaseConfigBody) -> ss.DbConnParams:
    return ss.DbConnParams(
        host=body.host.strip(),
        port=int(body.port),
        user=body.user.strip(),
        password=body.password,
        database=body.database.strip(),
    )


@router.get("/status")
def get_setup_status():
    base = ss.setup_status_from_db()
    base["mysql_cli_installed"], base["mysql_cli_version"] = ss.check_mysql_cli_installed()
    return base


@router.post("/check-mysql")
def post_check_mysql(body: CheckMysqlBody | None = None):
    b = body or CheckMysqlBody()
    installed, version_line = ss.check_mysql_cli_installed()
    port_open = ss.check_tcp_port_open(b.host, int(b.port))
    return {
        "mysql_cli_installed": installed,
        "mysql_cli_version": version_line,
        "tcp_port_open": port_open,
        "host": b.host,
        "port": b.port,
    }


@router.post("/test-connection")
def post_test_connection(body: DatabaseConfigBody):
    p = _params(body)
    server_ok, server_err = ss.test_mysql_connection(p, database="mysql")
    if not server_ok:
        return {"ok": False, "error": server_err, "database_exists": False}
    exists = ss.database_exists(p, p.database)
    if exists:
        db_ok, db_err = ss.test_mysql_connection(p)
        return {"ok": db_ok, "error": db_err, "database_exists": True}
    return {"ok": True, "error": None, "database_exists": False}


@router.post("/create-database")
def post_create_database(body: CreateDatabaseBody):
    p = _params(body)
    ok, err = ss.test_mysql_connection(
        ss.DbConnParams(
            host=p.host,
            port=p.port,
            user=p.user,
            password=p.password,
            database="mysql",
        )
    )
    if not ok:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "CONNECTION_FAILED",
                "message": err or "无法连接 MySQL",
                "error_type": "setup_error",
                "details": [],
            },
        )
    try:
        ss.create_database(p, p.database)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "CREATE_DB_FAILED",
                "message": str(exc),
                "error_type": "setup_error",
                "details": [],
            },
        ) from exc
    return {"ok": True, "database": p.database}


@router.post("/save-config")
def post_save_config(body: SaveConfigBody):
    try:
        ss.save_database_config_to_env(body.host, body.port, body.user, body.password, body.database)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_DATABASE_CONFIG",
                "message": str(exc),
                "error_type": "setup_error",
                "details": [],
            },
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={
                "code": "SAVE_ENV_FAILED",
                "message": str(exc),
                "error_type": "setup_error",
                "details": [],
            },
        ) from exc
    return {"ok": True, "database_configured": _db.is_database_configured()}


@router.post("/init-schema")
def post_init_schema():
    if not _db.is_database_configured():
        raise HTTPException(
            status_code=503,
            detail={
                "code": "DATABASE_NOT_CONFIGURED",
                "message": "请先保存数据库配置",
                "error_type": "setup_required",
                "details": [],
            },
        )
    try:
        ss.init_schema_orm()
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={
                "code": "INIT_SCHEMA_FAILED",
                "message": str(exc),
                "error_type": "setup_error",
                "details": [],
            },
        ) from exc
    return {"ok": True}


@router.post("/import-csv/stream")
async def post_import_csv_stream(body: ImportCsvBody):
    if _db.engine is None:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "DATABASE_NOT_CONFIGURED",
                "message": "请先完成数据库配置",
                "error_type": "setup_required",
                "details": [],
            },
        )
    if not _db.database_settings:
        raise HTTPException(status_code=503, detail={"code": "DATABASE_NOT_CONFIGURED", "message": "缺少配置"})

    params = ss.DbConnParams(
        host=_db.database_settings["MYSQL_HOST"],
        port=int(_db.database_settings["MYSQL_PORT"]),
        user=_db.database_settings["MYSQL_USER"],
        password=_db.database_settings["MYSQL_PASSWORD"],
        database=_db.database_settings["MYSQL_DATABASE"],
    )
    q: queue.Queue = queue.Queue()
    csv_path = Path(body.csv_path)

    def runner():
        ss.run_import_with_queue(params, csv_path, truncate_first=body.truncate_first, q=q)

    threading.Thread(target=runner, daemon=True).start()

    return StreamingResponse(
        ss.stream_queue_events(q),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@router.post("/build-summaries/stream")
async def post_build_summaries_stream():
    if _db.engine is None:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "DATABASE_NOT_CONFIGURED",
                "message": "请先完成数据库配置",
                "error_type": "setup_required",
                "details": [],
            },
        )
    q: queue.Queue = queue.Queue()

    def runner():
        ss.build_all_summaries_with_queue(q)

    threading.Thread(target=runner, daemon=True).start()

    return StreamingResponse(
        ss.stream_queue_events(q),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )

