import asyncio
import logging
import os
import time
import uuid
from urllib.parse import urlencode

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from sqlalchemy import text
import uvicorn

from app.routers import analytics, setup
from app.cache import ResponseCache, build_etag
from app.database import SessionLocal, is_database_configured
from app.contracts import CONTRACT_VERSION, API_VERSION
from app.schemas.crime import ErrorResponseModel

app = FastAPI(
    title="Chicago Crime Visualization API",
    description="Backend API for Chicago Crime Data Visualization Desktop App",
    version="1.0.1"
)

logger = logging.getLogger("chicago_crime_api")
if not logger.handlers:
    logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", "600"))
CACHE_MAX_ENTRIES = int(os.getenv("CACHE_MAX_ENTRIES", "512"))
SLOW_QUERY_THRESHOLD_MS = int(os.getenv("SLOW_QUERY_THRESHOLD_MS", "800"))
response_cache = ResponseCache(ttl_seconds=CACHE_TTL_SECONDS, max_entries=CACHE_MAX_ENTRIES)


def get_request_id(request: Request) -> str:
    request_id = getattr(request.state, "request_id", None)
    if request_id:
        return request_id
    return str(uuid.uuid4())


def parse_cors_allowed_origins() -> list[str]:
    raw_value = os.getenv("CORS_ALLOWED_ORIGINS", "").strip()
    defaults = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "file://",
    ]
    if not raw_value:
        return defaults
    origins = [item.strip() for item in raw_value.split(",") if item.strip()]
    merged = list(dict.fromkeys(defaults + origins))
    return merged


def build_error_payload(
    request: Request,
    code: str,
    message: str,
    error_type: str,
    details: list[dict[str, str]] | None = None,
) -> ErrorResponseModel:
    state_contract = {
        "empty": {
            "is_empty": False,
            "size": 0,
            "display": "content",
            "reason": "error_state",
        },
        "loading": {
            "is_loading": False,
            "display": "skeleton",
            "next_action": "wait_or_retry",
        },
        "error": {
            "is_error": True,
            "retryable": True,
            "code_field": "code",
            "message_field": "message",
            "request_id_field": "request_id",
        },
    }
    return ErrorResponseModel(
        code=code,
        message=message,
        error_type=error_type,
        details=details or [],
        request_id=get_request_id(request),
        meta={
            "contract_version": CONTRACT_VERSION,
            "api_version": API_VERSION,
            "state_contract": state_contract,
        },
    )


def is_cacheable_request(request: Request) -> bool:
    return request.method == "GET" and request.url.path.startswith("/api/v1/analytics/")


def build_cache_key(request: Request) -> str:
    query_items = sorted(request.query_params.multi_items())
    query_string = urlencode(query_items, doseq=True)
    return f"{request.url.path}?{query_string}"


def is_etag_matched(if_none_match: str | None, etag: str) -> bool:
    if not if_none_match:
        return False
    tags = [tag.strip() for tag in if_none_match.split(",") if tag.strip()]
    return "*" in tags or etag in tags


def log_request(
    request: Request,
    status_code: int,
    duration_ms: float,
    cache_status: str | None = None,
) -> None:
    request_id = get_request_id(request)
    logger.info(
        "request_completed request_id=%s method=%s path=%s status_code=%s duration_ms=%.2f cache=%s",
        request_id,
        request.method,
        request.url.path,
        status_code,
        duration_ms,
        cache_status or "BYPASS",
    )
    if duration_ms >= SLOW_QUERY_THRESHOLD_MS:
        logger.warning(
            "slow_query request_id=%s method=%s path=%s duration_ms=%.2f query=%s",
            request_id,
            request.method,
            request.url.path,
            duration_ms,
            request.url.query,
        )


@app.middleware("http")
async def attach_request_context(request: Request, call_next):
    request.state.request_id = str(uuid.uuid4())
    started_at = time.perf_counter()

    if is_cacheable_request(request):
        cache_key = build_cache_key(request)
        cached = response_cache.get(cache_key)
        if cached is not None:
            if is_etag_matched(request.headers.get("if-none-match"), cached.etag):
                not_modified = Response(status_code=304)
                not_modified.headers["ETag"] = cached.etag
                not_modified.headers["X-Cache"] = "HIT"
                not_modified.headers["X-Request-Id"] = request.state.request_id
                not_modified.headers["X-Contract-Version"] = CONTRACT_VERSION
                duration_ms = (time.perf_counter() - started_at) * 1000
                log_request(request, 304, duration_ms, "HIT")
                return not_modified
            cached_response = Response(
                content=cached.body,
                status_code=cached.status_code,
                media_type=cached.media_type,
            )
            cached_response.headers["ETag"] = cached.etag
            cached_response.headers["X-Cache"] = "HIT"
            cached_response.headers["X-Request-Id"] = request.state.request_id
            cached_response.headers["X-Contract-Version"] = CONTRACT_VERSION
            duration_ms = (time.perf_counter() - started_at) * 1000
            log_request(request, cached.status_code, duration_ms, "HIT")
            return cached_response

    response = await call_next(request)
    response.headers["X-Request-Id"] = request.state.request_id
    response.headers["X-Contract-Version"] = CONTRACT_VERSION
    cache_status = "BYPASS"

    if is_cacheable_request(request):
        original_headers = dict(response.headers)
        body = getattr(response, "body", None) or b""
        if (not body) and hasattr(response, "body_iterator") and response.body_iterator is not None:
            chunks: list[bytes] = []
            async for chunk in response.body_iterator:
                chunks.append(chunk)
            body = b"".join(chunks)
            rebuilt = Response(
                content=body,
                status_code=response.status_code,
                media_type=response.media_type,
            )
            for key, value in original_headers.items():
                rebuilt.headers[key] = value
            response = rebuilt
        etag = build_etag(body)
        response.headers["ETag"] = etag
        response.headers["X-Cache"] = "MISS"
        cache_status = "MISS"
        if response.status_code == 200:
            cache_key = build_cache_key(request)
            response_cache.set(
                key=cache_key,
                status_code=response.status_code,
                media_type=response.media_type,
                body=body,
                etag=etag,
            )
            if is_etag_matched(request.headers.get("if-none-match"), etag):
                not_modified = Response(status_code=304)
                not_modified.headers["ETag"] = etag
                not_modified.headers["X-Cache"] = "REVALIDATED"
                not_modified.headers["X-Request-Id"] = request.state.request_id
                not_modified.headers["X-Contract-Version"] = CONTRACT_VERSION
                duration_ms = (time.perf_counter() - started_at) * 1000
                log_request(request, 304, duration_ms, "REVALIDATED")
                return not_modified

    duration_ms = (time.perf_counter() - started_at) * 1000
    log_request(request, response.status_code, duration_ms, cache_status)
    return response

# Configure CORS — local desktop app, backend only listens on localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(setup.router)
app.include_router(analytics.router)


@app.exception_handler(RequestValidationError)
async def handle_validation_error(request: Request, exc: RequestValidationError):
    details = []
    for item in exc.errors():
        loc = item.get("loc", ())
        field = ".".join(str(v) for v in loc if v != "query") or "query"
        details.append(
            {
                "field": field,
                "reason": item.get("msg", "参数不合法"),
            }
        )
    payload = build_error_payload(
        request=request,
        code="PARAM_VALIDATION_ERROR",
        message="请求参数校验失败",
        error_type="parameter_error",
        details=details,
    )
    return JSONResponse(status_code=422, content=payload.model_dump())


@app.exception_handler(HTTPException)
async def handle_http_exception(request: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict):
        payload = build_error_payload(
            request=request,
            code=detail.get("code", "BUSINESS_ERROR"),
            message=detail.get("message", "请求失败"),
            error_type=detail.get("error_type", "business_error"),
            details=detail.get("details", []),
        )
    else:
        code = "BUSINESS_ERROR" if exc.status_code < 500 else "SYSTEM_ERROR"
        error_type = "business_error" if exc.status_code < 500 else "system_error"
        payload = build_error_payload(
            request=request,
            code=code,
            message=str(detail),
            error_type=error_type,
            details=[],
        )
    return JSONResponse(status_code=exc.status_code, content=payload.model_dump())


@app.exception_handler(Exception)
async def handle_exception(request: Request, exc: Exception):
    payload = build_error_payload(
        request=request,
        code="SYSTEM_ERROR",
        message="系统内部错误，请稍后重试",
        error_type="system_error",
        details=[],
    )
    return JSONResponse(status_code=500, content=payload.model_dump())

@app.get("/")
def read_root():
    return {"message": "Welcome to Chicago Crime Visualization API"}


@app.get("/healthz")
def health_check(request: Request):
    request_id = get_request_id(request)
    db_ok = True
    db_error_code = None
    if SessionLocal is None:
        db_ok = False
        db_error_code = "DATABASE_NOT_CONFIGURED"
    else:
        try:
            with SessionLocal() as db:
                db.execute(text("SELECT 1"))
        except Exception as exc:
            db_ok = False
            db_error_code = "DATABASE_UNAVAILABLE"
            logger.exception("health_check_database_failed request_id=%s error=%s", request_id, str(exc))
    logger.info("health_check_completed request_id=%s status=%s", request_id, "ok" if db_ok else "degraded")
    dependencies = {
        "database": {"ok": db_ok, "error": db_error_code},
        "cache": response_cache.stats(),
    }
    return {
        "status": "ok" if db_ok else "degraded",
        "dependencies": dependencies,
        "request_id": request_id,
        "meta": {"contract_version": CONTRACT_VERSION, "api_version": API_VERSION},
    }

WARM_UP_PATHS = [
    "/api/v1/analytics/trend/yearly",
    "/api/v1/analytics/trend/monthly?year=2023",
    "/api/v1/analytics/trend/weekly",
    "/api/v1/analytics/trend/hourly",
    "/api/v1/analytics/types/proportion?limit=10",
    "/api/v1/analytics/types/proportion?limit=20",
    "/api/v1/analytics/types/proportion?limit=5",
    "/api/v1/analytics/districts/comparison?limit=10",
    "/api/v1/analytics/arrests/rate",
    "/api/v1/analytics/domestic/proportion",
    "/api/v1/analytics/types/arrest_rate?limit=10",
    "/api/v1/analytics/types/arrest_rate?limit=5",
    "/api/v1/analytics/location/types?limit=15",
    "/api/v1/analytics/blocks/top_dangerous?limit=10",
]


async def warm_cache():
    import httpx
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    port = int(os.getenv("BACKEND_PORT", "8000"))
    base = f"http://127.0.0.1:{port}"
    logger.info("cache_warmup_start paths=%d", len(WARM_UP_PATHS))
    async with httpx.AsyncClient(timeout=120) as client:
        for path in WARM_UP_PATHS:
            try:
                resp = await client.get(f"{base}{path}")
                logger.info("cache_warmup path=%s status=%s", path, resp.status_code)
            except Exception as exc:
                logger.warning("cache_warmup_failed path=%s error=%s", path, str(exc))
    logger.info("cache_warmup_done")


async def ensure_runtime_indexes():
    def _ensure():
        db = SessionLocal()
        try:
            rows = db.execute(
                text(
                    """
                    SELECT INDEX_NAME
                    FROM information_schema.STATISTICS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'crimes'
                    """
                )
            ).fetchall()
            existing = {str(row[0]) for row in rows}
            if "idx_block" not in existing:
                logger.info("runtime_index_create_start index=idx_block")
                db.execute(text("CREATE INDEX idx_block ON crimes (block)"))
                db.commit()
                logger.info("runtime_index_create_done index=idx_block")
        except Exception as exc:
            db.rollback()
            logger.warning("runtime_index_create_failed index=idx_block error=%s", str(exc))
        finally:
            db.close()

    await asyncio.to_thread(_ensure)


@app.on_event("startup")
async def on_startup():
    if is_database_configured():
        asyncio.create_task(warm_cache())
        asyncio.create_task(ensure_runtime_indexes())


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
