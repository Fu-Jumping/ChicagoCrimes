---
name: chicago-crime-backend
description: FastAPI backend for Chicago Crime Visualization. Use when working on backend API, analytics endpoints, database queries, caching, error handling, data contracts, or Python backend code in this project.
---

# Chicago Crime Backend

## Stack

- **Python + FastAPI** — `backend/main.py` 为入口，监听 `http://localhost:8000`
- **SQLAlchemy** — ORM，`backend/app/database.py`
- **SQLite** — 本地数据库（芝加哥犯罪记录）
- **内存缓存** — `backend/app/cache.py`，TTL=120s，最大256条目

## 目录结构

```
backend/
├── main.py                  # FastAPI 应用入口、中间件、异常处理
├── app/
│   ├── contracts.py         # 版本常量、参数约束、校验工具
│   ├── database.py          # SQLAlchemy Session
│   ├── cache.py             # ResponseCache + ETag 支持
│   ├── routers/
│   │   └── analytics.py     # 所有分析接口路由（10个端点）
│   ├── services/
│   │   └── analytics.py     # 数据库查询业务逻辑
│   ├── models/
│   │   └── crime.py         # SQLAlchemy ORM 模型
│   └── schemas/
│       └── crime.py         # Pydantic 响应模型 ResponseModel
└── tests/
    ├── test_task2_security_baseline.py
    ├── test_task3_contract.py
    ├── test_task4_validation.py
    └── test_task5_special_validation.py
```

## 关键常量（contracts.py）

```python
API_VERSION = "v1"
CONTRACT_VERSION = "2026.03.0"
YEAR_MIN = 2001
YEAR_MAX = 2100
LIMIT_MIN = 1
LIMIT_MAX = 100
SUPPORTED_SORT_VALUES = {"asc", "desc"}
```

## 所有分析接口

| 路径 | 维度 | 指标 | 关键参数 |
|------|------|------|----------|
| `GET /api/v1/analytics/trend/yearly` | year | count | start_year, end_year, primary_type, sort |
| `GET /api/v1/analytics/trend/monthly` | month | count | year（必填，默认2023） |
| `GET /api/v1/analytics/trend/weekly` | day_of_week | count | year, start_date, end_date |
| `GET /api/v1/analytics/trend/hourly` | hour | count | year, start_date, end_date |
| `GET /api/v1/analytics/types/proportion` | primary_type | count | year, limit(默认10), sort |
| `GET /api/v1/analytics/types/arrest_rate` | primary_type | arrested_count, not_arrested_count, total_count, arrest_rate | year, limit, sort |
| `GET /api/v1/analytics/districts/comparison` | district | count | year, limit(默认20), sort |
| `GET /api/v1/analytics/arrests/rate` | arrest | count | year, start_date, end_date |
| `GET /api/v1/analytics/domestic/proportion` | domestic | count | year, start_date, end_date |
| `GET /api/v1/analytics/location/types` | location_description | count | year, limit(默认10), sort |

其他端点：`GET /healthz`（健康检查），`GET /`（欢迎信息）

## 统一响应结构

```json
{
  "code": "SUCCESS",
  "message": "ok",
  "data": [{"year": 2020, "count": 12345}],
  "meta": {
    "filters": {"start_year": 2015, "end_year": 2023},
    "dimension": ["year"],
    "metrics": ["count"],
    "dimension_definitions": [{"field": "year", "label": "年份", "granularity": "year"}],
    "metric_definitions": [{"field": "count", "label": "案件数量", "aggregation": "count", "unit": "case"}],
    "state_contract": {
      "empty": {"is_empty": false, "size": 9, "display": "content"},
      "loading": {"is_loading": false},
      "error": {"is_error": false}
    },
    "data_quality": {"status": "pass", "checked_rows": 9, "alerts": []},
    "generated_at": "2026-03-26T12:00:00Z",
    "contract_version": "2026.03.0",
    "api_version": "v1"
  },
  "request_id": "uuid-string"
}
```

## 缓存与 ETag

- 所有 `GET /api/v1/analytics/` 请求自动缓存（TTL 120s）
- 响应头：`ETag`、`X-Cache: HIT/MISS`、`X-Request-Id`、`X-Contract-Version`
- 支持 `If-None-Match` 请求头 → 304 Not Modified
- 缓存 key = `path + sorted query string`

## 错误处理

| HTTP 状态 | code | 场景 |
|-----------|------|------|
| 422 | PARAM_VALIDATION_ERROR | 参数校验失败（年份范围、日期逻辑等） |
| 4xx | BUSINESS_ERROR | 业务逻辑错误 |
| 5xx | SYSTEM_ERROR | 系统内部错误 |

所有错误响应包含 `request_id`、`details` 数组和 `meta.contract_version`。

## 数据质量检查

每个接口响应的 `meta.data_quality`：

```json
{
  "status": "pass",
  "checked_rows": 9,
  "null_issue_count": 0,
  "anomaly_issue_count": 0,
  "alerts": []
}
```

`status` 为 `"warn"` 时后端会输出 WARNING 日志，前端可通过 `alerts` 数组展示数据质量提示。

## 启动方式

```bash
cd backend
pip install -r requirements.txt
python main.py
# 或: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## 运行测试

```bash
cd backend
pytest tests/ -v
```
