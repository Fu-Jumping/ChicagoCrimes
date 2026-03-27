---
name: api-contract
description: Data contract, API versioning, and frontend-backend protocol for Chicago Crime Visualization. Use when working on API response format, field naming, contract versioning, meta fields, data quality, state contract, or frontend-backend data alignment.
---

# API 数据契约

## 契约版本

```
CONTRACT_VERSION = "2026.03.0"  # backend/app/contracts.py
API_VERSION = "v1"
```

所有响应头包含 `X-Contract-Version`，前端可据此判断兼容性。

## 统一响应 Envelope

### 成功响应结构

```json
{
  "code": "SUCCESS",
  "message": "ok",
  "data": [{"year": 2020, "count": 12345}],
  "meta": {
    "filters": {"start_year": 2015, "end_year": 2023},
    "dimension": ["year"],
    "metrics": ["count"],
    "dimension_definitions": [
      {"field": "year", "label": "年份", "granularity": "year"}
    ],
    "metric_definitions": [
      {"field": "count", "label": "案件数量", "aggregation": "count", "unit": "case"}
    ],
    "metric_scope": "after_filters",
    "metric_scope_note": "所有指标基于当前筛选条件聚合",
    "state_contract": {
      "empty": {"is_empty": false, "size": 9, "display": "content", "reason": "has_data"},
      "loading": {"is_loading": false, "display": "skeleton", "next_action": "wait_or_retry"},
      "error": {"is_error": false, "retryable": true}
    },
    "data_quality": {
      "status": "pass",
      "checked_rows": 9,
      "null_issue_count": 0,
      "anomaly_issue_count": 0,
      "alerts": []
    },
    "generated_at": "2026-03-26T12:00:00Z",
    "contract_version": "2026.03.0",
    "api_version": "v1"
  },
  "request_id": "uuid-string"
}
```

### 错误响应结构

```json
{
  "code": "PARAM_VALIDATION_ERROR",
  "message": "请求参数校验失败",
  "error_type": "parameter_error",
  "details": [{"field": "start_year", "reason": "年份区间不合法"}],
  "request_id": "uuid-string",
  "meta": {"contract_version": "2026.03.0", "api_version": "v1"}
}
```

## 维度字段定义

| field | label | granularity |
|-------|-------|-------------|
| year | 年份 | year |
| month | 月份 | month |
| day_of_week | 星期 | week_day |
| hour | 小时 | hour |
| primary_type | 犯罪类型 | category |
| district | 行政区 | category |
| location_description | 地点类型 | category |
| arrest | 是否逮捕 | boolean |
| domestic | 是否家暴 | boolean |

## 指标字段定义

| field | label | aggregation | unit | 口径约束 |
|-------|-------|-------------|------|----------|
| count | 案件数量 | count | case | >= 0 |
| arrested_count | 逮捕数 | count | case | >= 0 |
| not_arrested_count | 未逮捕数 | count | case | >= 0 |
| total_count | 总数 | count | case | = arrested_count + not_arrested_count |
| arrest_rate | 逮捕率 | ratio | ratio | 0.0 ~ 1.0 |

## 错误码规范

| HTTP 状态 | code | error_type | 场景 |
|-----------|------|------------|------|
| 422 | PARAM_VALIDATION_ERROR | parameter_error | 参数不合法 |
| 4xx | BUSINESS_ERROR | business_error | 业务逻辑错误 |
| 5xx | SYSTEM_ERROR | system_error | 系统内部错误 |

## 响应头协议

| 请求头 / 响应头 | 说明 |
|----------------|------|
| `X-Request-Id` | 每次请求唯一 UUID |
| `X-Contract-Version` | 当前契约版本 |
| `ETag` | 响应体哈希，用于缓存协商 |
| `X-Cache` | `HIT` / `MISS` / `REVALIDATED` |
| `If-None-Match` (请求) | 携带 ETag 触发 304 |

## state_contract 前端使用约定

前端 `DataStatePanel` 基于 `meta.state_contract` 决定渲染模式：

```typescript
if (meta.state_contract.empty.is_empty) {
  // 显示空态
} else if (meta.state_contract.error.is_error) {
  // 显示错误态
} else {
  // 正常渲染图表
}
```

## 参数约束常量

```python
YEAR_MIN = 2001   # 数据最早年份
YEAR_MAX = 2100
LIMIT_MIN = 1
LIMIT_MAX = 100   # 分类接口返回条数上限
```

## 前端接口类型定义（api/index.ts）

```typescript
interface ApiMeta {
  filters?: Record<string, unknown>
  dimension?: string[]
  metrics?: string[]
  state_contract?: { empty?: ...; loading?: ...; error?: ... }
  data_quality?: { status: string; alerts: ... }
  generated_at?: string
  contract_version?: string
  api_version?: string
}

interface ApiResponse<T> {
  code: string
  message: string
  data: T
  meta: ApiMeta
  request_id: string
}
```
