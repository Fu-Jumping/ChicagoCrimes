# 核心分析接口示例响应（可复用）

本文档提供核心接口的可复用示例响应，用于前后端联调、回归测试和契约核对。

## 通用成功响应结构

```json
{
  "code": "OK",
  "message": "success",
  "data": [],
  "meta": {
    "filters": {},
    "dimension": [],
    "metrics": [],
    "dimension_definitions": [],
    "metric_definitions": [],
    "metric_scope": "after_filters",
    "metric_scope_note": "所有指标基于当前筛选条件聚合",
    "state_contract": {
      "empty": {
        "is_empty": false,
        "size": 0,
        "display": "content",
        "reason": "has_data"
      },
      "loading": {
        "is_loading": false,
        "display": "skeleton",
        "next_action": "wait_or_retry"
      },
      "error": {
        "is_error": false,
        "retryable": true,
        "code_field": "code",
        "message_field": "message",
        "request_id_field": "request_id"
      }
    },
    "generated_at": "2026-03-26T10:00:00Z",
    "contract_version": "2026.03.0",
    "api_version": "v1"
  },
  "request_id": "f6e0e31e-4da5-4096-becf-6a887e6750a0"
}
```

## 1) 月度趋势

- 接口：`GET /api/v1/analytics/trend/monthly?year=2024`

```json
{
  "code": "OK",
  "message": "success",
  "data": [
    { "month": 1, "count": 120, "key": "1" },
    { "month": 2, "count": 98, "key": "2" },
    { "month": 3, "count": 135, "key": "3" }
  ],
  "meta": {
    "filters": { "year": 2024 },
    "dimension": ["month"],
    "metrics": ["count"],
    "dimension_definitions": [{ "field": "month", "label": "月份", "granularity": "month" }],
    "metric_definitions": [{ "field": "count", "label": "案件数量", "aggregation": "count", "unit": "case" }],
    "metric_scope": "after_filters",
    "metric_scope_note": "所有指标基于当前筛选条件聚合",
    "state_contract": {
      "empty": { "is_empty": false, "size": 3, "display": "content", "reason": "has_data" },
      "loading": { "is_loading": false, "display": "skeleton", "next_action": "wait_or_retry" },
      "error": {
        "is_error": false,
        "retryable": true,
        "code_field": "code",
        "message_field": "message",
        "request_id_field": "request_id"
      }
    },
    "generated_at": "2026-03-26T10:00:00Z",
    "contract_version": "2026.03.0",
    "api_version": "v1"
  },
  "request_id": "cf93a388-cb46-4f97-8b3a-3b0ee64d83ef"
}
```

## 2) 年度趋势

- 接口：`GET /api/v1/analytics/trend/yearly?start_year=2021&end_year=2024&sort=asc`

```json
{
  "code": "OK",
  "message": "success",
  "data": [
    { "year": 2021, "count": 1240, "key": "2021" },
    { "year": 2022, "count": 1312, "key": "2022" },
    { "year": 2023, "count": 1291, "key": "2023" },
    { "year": 2024, "count": 1375, "key": "2024" }
  ],
  "meta": {
    "filters": {
      "start_year": 2021,
      "end_year": 2024,
      "start_date": null,
      "end_date": null,
      "primary_type": null
    },
    "dimension": ["year"],
    "metrics": ["count"],
    "dimension_definitions": [{ "field": "year", "label": "年份", "granularity": "year" }],
    "metric_definitions": [{ "field": "count", "label": "案件数量", "aggregation": "count", "unit": "case" }],
    "metric_scope": "after_filters",
    "metric_scope_note": "所有指标基于当前筛选条件聚合",
    "state_contract": {
      "empty": { "is_empty": false, "size": 4, "display": "content", "reason": "has_data" },
      "loading": { "is_loading": false, "display": "skeleton", "next_action": "wait_or_retry" },
      "error": {
        "is_error": false,
        "retryable": true,
        "code_field": "code",
        "message_field": "message",
        "request_id_field": "request_id"
      }
    },
    "generated_at": "2026-03-26T10:00:00Z",
    "contract_version": "2026.03.0",
    "api_version": "v1",
    "sort": "asc"
  },
  "request_id": "bf59086c-1eb8-4eb2-9c18-4cf88d302779"
}
```

## 3) 类型占比（饼图）

- 接口：`GET /api/v1/analytics/types/proportion?year=2024&limit=5&sort=desc`

```json
{
  "code": "OK",
  "message": "success",
  "data": [
    { "primary_type": "THEFT", "count": 382, "key": "THEFT" },
    { "primary_type": "BATTERY", "count": 275, "key": "BATTERY" },
    { "primary_type": "CRIMINAL DAMAGE", "count": 214, "key": "CRIMINAL DAMAGE" }
  ],
  "meta": {
    "filters": {
      "year": 2024,
      "start_date": null,
      "end_date": null,
      "limit": 5
    },
    "dimension": ["primary_type"],
    "metrics": ["count"],
    "dimension_definitions": [{ "field": "primary_type", "label": "犯罪类型", "granularity": "category" }],
    "metric_definitions": [{ "field": "count", "label": "案件数量", "aggregation": "count", "unit": "case" }],
    "metric_scope": "after_filters",
    "metric_scope_note": "所有指标基于当前筛选条件聚合",
    "state_contract": {
      "empty": { "is_empty": false, "size": 3, "display": "content", "reason": "has_data" },
      "loading": { "is_loading": false, "display": "skeleton", "next_action": "wait_or_retry" },
      "error": {
        "is_error": false,
        "retryable": true,
        "code_field": "code",
        "message_field": "message",
        "request_id_field": "request_id"
      }
    },
    "generated_at": "2026-03-26T10:00:00Z",
    "contract_version": "2026.03.0",
    "api_version": "v1",
    "sort": "desc"
  },
  "request_id": "6c9adfa3-c3d0-4746-bb42-c37b8cf010fd"
}
```

## 4) 区域对比（柱状图）

- 接口：`GET /api/v1/analytics/districts/comparison?year=2024&limit=10&sort=desc`

```json
{
  "code": "OK",
  "message": "success",
  "data": [
    { "district": "11", "count": 203, "key": "11" },
    { "district": "8", "count": 189, "key": "8" },
    { "district": "6", "count": 171, "key": "6" }
  ],
  "meta": {
    "filters": {
      "year": 2024,
      "start_date": null,
      "end_date": null,
      "limit": 10
    },
    "dimension": ["district"],
    "metrics": ["count"],
    "dimension_definitions": [{ "field": "district", "label": "行政区", "granularity": "category" }],
    "metric_definitions": [{ "field": "count", "label": "案件数量", "aggregation": "count", "unit": "case" }],
    "metric_scope": "after_filters",
    "metric_scope_note": "所有指标基于当前筛选条件聚合",
    "state_contract": {
      "empty": { "is_empty": false, "size": 3, "display": "content", "reason": "has_data" },
      "loading": { "is_loading": false, "display": "skeleton", "next_action": "wait_or_retry" },
      "error": {
        "is_error": false,
        "retryable": true,
        "code_field": "code",
        "message_field": "message",
        "request_id_field": "request_id"
      }
    },
    "generated_at": "2026-03-26T10:00:00Z",
    "contract_version": "2026.03.0",
    "api_version": "v1",
    "sort": "desc"
  },
  "request_id": "6da4f861-af63-46d7-a12b-f50723cb9ecb"
}
```

## 5) 犯罪类型逮捕率（复合指标）

- 接口：`GET /api/v1/analytics/types/arrest_rate?year=2024&limit=5&sort=desc`

```json
{
  "code": "OK",
  "message": "success",
  "data": [
    {
      "primary_type": "ROBBERY",
      "arrested_count": 72,
      "not_arrested_count": 118,
      "total_count": 190,
      "arrest_rate": 0.3789,
      "key": "ROBBERY"
    },
    {
      "primary_type": "BATTERY",
      "arrested_count": 96,
      "not_arrested_count": 179,
      "total_count": 275,
      "arrest_rate": 0.3491,
      "key": "BATTERY"
    }
  ],
  "meta": {
    "filters": {
      "year": 2024,
      "start_date": null,
      "end_date": null,
      "limit": 5
    },
    "dimension": ["primary_type"],
    "metrics": ["arrested_count", "not_arrested_count", "total_count", "arrest_rate"],
    "dimension_definitions": [{ "field": "primary_type", "label": "犯罪类型", "granularity": "category" }],
    "metric_definitions": [
      { "field": "arrested_count", "label": "逮捕数", "aggregation": "count", "unit": "case" },
      { "field": "not_arrested_count", "label": "未逮捕数", "aggregation": "count", "unit": "case" },
      { "field": "total_count", "label": "总数", "aggregation": "count", "unit": "case" },
      { "field": "arrest_rate", "label": "逮捕率", "aggregation": "ratio", "unit": "ratio" }
    ],
    "metric_scope": "after_filters",
    "metric_scope_note": "所有指标基于当前筛选条件聚合",
    "state_contract": {
      "empty": { "is_empty": false, "size": 2, "display": "content", "reason": "has_data" },
      "loading": { "is_loading": false, "display": "skeleton", "next_action": "wait_or_retry" },
      "error": {
        "is_error": false,
        "retryable": true,
        "code_field": "code",
        "message_field": "message",
        "request_id_field": "request_id"
      }
    },
    "generated_at": "2026-03-26T10:00:00Z",
    "contract_version": "2026.03.0",
    "api_version": "v1",
    "sort": "desc"
  },
  "request_id": "89eb1bb2-5e7e-4381-9e5e-8f312018db63"
}
```
