import os
from urllib.parse import quote_plus

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

REQUIRED_DATABASE_ENV_KEYS = [
    "MYSQL_USER",
    "MYSQL_PASSWORD",
    "MYSQL_HOST",
    "MYSQL_PORT",
    "MYSQL_DATABASE",
]
BLOCKED_LEGACY_DEFAULTS = {
    "MYSQL_USER": {"root"},
    "MYSQL_PASSWORD": {"123456"},
    "MYSQL_DATABASE": {"chicago_crime"},
}


def validate_database_runtime_settings() -> dict[str, str]:
    values: dict[str, str] = {}
    missing_keys: list[str] = []
    blocked_keys: list[str] = []
    for key in REQUIRED_DATABASE_ENV_KEYS:
        value = os.getenv(key, "").strip()
        if not value:
            missing_keys.append(key)
            continue
        values[key] = value
        blocked_defaults = BLOCKED_LEGACY_DEFAULTS.get(key, set())
        if value in blocked_defaults:
            blocked_keys.append(key)
    if missing_keys:
        missing_text = ", ".join(missing_keys)
        raise RuntimeError(f"启动阻断：缺少数据库环境变量 {missing_text}")
    if blocked_keys:
        blocked_text = ", ".join(blocked_keys)
        raise RuntimeError(f"启动阻断：检测到不安全默认数据库凭据 {blocked_text}")
    return values


database_settings = validate_database_runtime_settings()
MYSQL_USER = quote_plus(database_settings["MYSQL_USER"])
MYSQL_PASSWORD = quote_plus(database_settings["MYSQL_PASSWORD"])
MYSQL_HOST = database_settings["MYSQL_HOST"]
MYSQL_PORT = database_settings["MYSQL_PORT"]
MYSQL_DATABASE = database_settings["MYSQL_DATABASE"]
SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=1800,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
