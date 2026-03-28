import os
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.config.env_file import repo_root as _get_repo_root

# Load .env from the data directory (repo root in dev, %APPDATA%/ChicagoCrimeViz in bundle)
_REPO_ROOT = _get_repo_root()
load_dotenv(_REPO_ROOT / ".env")

_REQUIRED_NONEMPTY_KEYS = [
    "MYSQL_USER",
    "MYSQL_HOST",
    "MYSQL_PORT",
    "MYSQL_DATABASE",
]
_OPTIONAL_EMPTY_KEYS = ["MYSQL_PASSWORD"]
REQUIRED_DATABASE_ENV_KEYS = _REQUIRED_NONEMPTY_KEYS + _OPTIONAL_EMPTY_KEYS


def validate_database_runtime_settings() -> dict[str, str]:
    values: dict[str, str] = {}
    missing_keys: list[str] = []
    for key in _REQUIRED_NONEMPTY_KEYS:
        value = os.getenv(key, "").strip()
        if not value:
            missing_keys.append(key)
            continue
        values[key] = value
    for key in _OPTIONAL_EMPTY_KEYS:
        values[key] = os.getenv(key, "")
    if missing_keys:
        missing_text = ", ".join(missing_keys)
        raise RuntimeError(f"启动阻断：缺少数据库环境变量 {missing_text}")
    return values


def _try_load_database_settings() -> dict[str, str] | None:
    """Return validated settings, or None if env is incomplete (setup wizard mode)."""
    missing = [k for k in _REQUIRED_NONEMPTY_KEYS if not os.getenv(k, "").strip()]
    if missing:
        return None
    try:
        return validate_database_runtime_settings()
    except RuntimeError:
        raise


def _build_engine_from_settings(settings: dict[str, str]):
    mysql_user = quote_plus(settings["MYSQL_USER"])
    mysql_password = quote_plus(settings["MYSQL_PASSWORD"])
    mysql_host = settings["MYSQL_HOST"]
    mysql_port = settings["MYSQL_PORT"]
    mysql_database = settings["MYSQL_DATABASE"]
    url = f"mysql+pymysql://{mysql_user}:{mysql_password}@{mysql_host}:{mysql_port}/{mysql_database}"
    return create_engine(
        url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        pool_recycle=1800,
    )


def _init_engine_session():
    global database_settings, engine, SessionLocal, SQLALCHEMY_DATABASE_URL
    settings = _try_load_database_settings()
    if settings is None:
        database_settings = None
        engine = None
        SessionLocal = None
        SQLALCHEMY_DATABASE_URL = ""
        return
    database_settings = settings
    SQLALCHEMY_DATABASE_URL = (
        f"mysql+pymysql://{quote_plus(settings['MYSQL_USER'])}:***@{settings['MYSQL_HOST']}:"
        f"{settings['MYSQL_PORT']}/{settings['MYSQL_DATABASE']}"
    )
    engine = _build_engine_from_settings(settings)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


database_settings: dict[str, str] | None = None
engine = None
SessionLocal = None
SQLALCHEMY_DATABASE_URL = ""

Base = declarative_base()

# Missing MYSQL_* → setup wizard mode (engine left unset). Unsafe defaults still raise.
_init_engine_session()


def reload_engine_from_env() -> None:
    """Reload ``.env`` from disk and recreate engine (after setup wizard saves config)."""
    load_dotenv(_REPO_ROOT / ".env", override=True)
    global database_settings, engine, SessionLocal
    old_engine = engine
    _init_engine_session()
    if old_engine is not None:
        old_engine.dispose()


def is_database_configured() -> bool:
    return engine is not None and SessionLocal is not None


def get_db():
    from fastapi import HTTPException

    if SessionLocal is None:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "DATABASE_NOT_CONFIGURED",
                "message": "数据库尚未配置，请先完成首次设置向导",
                "error_type": "setup_required",
                "details": [],
            },
        )
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
