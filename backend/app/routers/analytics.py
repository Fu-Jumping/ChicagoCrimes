import logging
from datetime import UTC, date, datetime, time
from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Optional, Literal, Dict, Any

from app.database import get_db
from app.schemas.crime import ResponseModel
from app.services import analytics as analytics_service
from app.contracts import (
    API_VERSION,
    CONTRACT_VERSION,
    YEAR_MIN,
    YEAR_MAX,
    LIMIT_MIN,
    LIMIT_MAX,
    is_valid_date_range,
    is_supported_sort,
)

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])
logger = logging.getLogger("chicago_crime_api")

DIMENSION_DEFINITION_MAP: Dict[str, Dict[str, str]] = {
    "year": {"label": "年份", "granularity": "year"},
    "month": {"label": "月份", "granularity": "month"},
    "day_of_week": {"label": "星期", "granularity": "week_day"},
    "hour": {"label": "小时", "granularity": "hour"},
    "primary_type": {"label": "犯罪类型", "granularity": "category"},
    "district": {"label": "行政区", "granularity": "category"},
    "community_area": {"label": "社区区域", "granularity": "category"},
    "block": {"label": "街区", "granularity": "category"},
    "season": {"label": "季节", "granularity": "season"},
    "status": {"label": "质量状态", "granularity": "category"},
    "location_description": {"label": "地点类型", "granularity": "category"},
    "arrest": {"label": "是否逮捕", "granularity": "boolean"},
    "domestic": {"label": "是否家暴", "granularity": "boolean"},
}

METRIC_DEFINITION_MAP: Dict[str, Dict[str, str]] = {
    "count": {"label": "案件数量", "aggregation": "count", "unit": "case"},
    "arrested_count": {"label": "逮捕数", "aggregation": "count", "unit": "case"},
    "not_arrested_count": {"label": "未逮捕数", "aggregation": "count", "unit": "case"},
    "total_count": {"label": "总数", "aggregation": "count", "unit": "case"},
    "arrest_rate": {"label": "逮捕率", "aggregation": "ratio", "unit": "ratio"},
    "proportion": {"label": "占比", "aggregation": "ratio", "unit": "ratio"},
    "rate": {"label": "比率", "aggregation": "ratio", "unit": "ratio"},
}


def get_request_id(request: Request) -> str:
    request_id = getattr(request.state, "request_id", None)
    return request_id or "unknown"


def to_datetime_range(start_date: Optional[date], end_date: Optional[date]) -> tuple[Optional[datetime], Optional[datetime]]:
    if start_date is None and end_date is None:
        return None, None
    if not is_valid_date_range(start_date, end_date):
        raise HTTPException(
            status_code=422,
            detail={
                "code": "PARAM_VALIDATION_ERROR",
                "message": "start_date 与 end_date 必须同时提供且 start_date 不能晚于 end_date",
                "error_type": "parameter_error",
                "details": [{"field": "start_date,end_date", "reason": "日期区间不合法"}],
            },
        )
    return (
        datetime.combine(start_date, time.min) if start_date else None,
        datetime.combine(end_date, time.max) if end_date else None,
    )


def validate_sort(sort: str) -> str:
    sort_value = sort.lower()
    if not is_supported_sort(sort_value):
        raise HTTPException(
            status_code=422,
            detail={
                "code": "PARAM_VALIDATION_ERROR",
                "message": "sort 参数仅支持 asc 或 desc",
                "error_type": "parameter_error",
                "details": [{"field": "sort", "reason": "仅支持 asc 或 desc"}],
            },
        )
    return sort_value


def build_definitions(fields: list[str], definition_map: Dict[str, Dict[str, str]]) -> list[Dict[str, Any]]:
    return [
        {
            "field": field,
            **definition_map.get(
                field,
                {"label": field, "granularity": "unknown", "aggregation": "unknown", "unit": "unknown"},
            ),
        }
        for field in fields
    ]


def build_state_contract(data: Any) -> Dict[str, Any]:
    size = len(data) if isinstance(data, list) else (1 if data else 0)
    is_empty = size == 0
    return {
        "empty": {
            "is_empty": is_empty,
            "size": size,
            "display": "empty" if is_empty else "content",
            "reason": "no_data_after_filters" if is_empty else "has_data",
        },
        "loading": {
            "is_loading": False,
            "display": "skeleton",
            "next_action": "wait_or_retry",
        },
        "error": {
            "is_error": False,
            "retryable": True,
            "code_field": "code",
            "message_field": "message",
            "request_id_field": "request_id",
        },
    }


def is_blank_value(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str) and value.strip() == "":
        return True
    return False


def is_valid_numeric_metric(value: Any) -> bool:
    if isinstance(value, bool):
        return False
    return isinstance(value, (int, float))


def build_data_quality_report(data: Any, dimensions: list[str], metrics: list[str]) -> Dict[str, Any]:
    rows = data if isinstance(data, list) else ([data] if isinstance(data, dict) else [])
    alerts: list[Dict[str, Any]] = []
    null_issue_count = 0
    caliber_issue_count = 0

    for row_index, row in enumerate(rows):
        for field in dimensions + metrics:
            if field not in row or is_blank_value(row.get(field)):
                null_issue_count += 1
                alerts.append(
                    {
                        "level": "warning",
                        "code": "DQ_NULL_VALUE",
                        "type": "null_value",
                        "row": row_index,
                        "field": field,
                        "message": f"字段 {field} 存在空值或缺失",
                    }
                )

        for metric in metrics:
            if metric not in row:
                continue
            metric_value = row.get(metric)
            if is_blank_value(metric_value):
                continue
            if metric in {"count", "arrested_count", "not_arrested_count", "total_count"}:
                if not is_valid_numeric_metric(metric_value) or metric_value < 0:
                    caliber_issue_count += 1
                    alerts.append(
                        {
                            "level": "warning",
                            "code": "DQ_ANOMALY_METRIC_SCOPE",
                            "type": "anomaly_scope",
                            "row": row_index,
                            "field": metric,
                            "message": f"字段 {metric} 不满足非负数口径",
                        }
                    )
            if metric == "arrest_rate":
                if not is_valid_numeric_metric(metric_value) or metric_value < 0 or metric_value > 1:
                    caliber_issue_count += 1
                    alerts.append(
                        {
                            "level": "warning",
                            "code": "DQ_ANOMALY_METRIC_SCOPE",
                            "type": "anomaly_scope",
                            "row": row_index,
                            "field": metric,
                            "message": "字段 arrest_rate 不满足 0~1 口径",
                        }
                    )

        if {"arrested_count", "not_arrested_count", "total_count"}.issubset(set(metrics)):
            arrested_count = row.get("arrested_count")
            not_arrested_count = row.get("not_arrested_count")
            total_count = row.get("total_count")
            if (
                is_valid_numeric_metric(arrested_count)
                and is_valid_numeric_metric(not_arrested_count)
                and is_valid_numeric_metric(total_count)
                and arrested_count + not_arrested_count != total_count
            ):
                caliber_issue_count += 1
                alerts.append(
                    {
                        "level": "warning",
                        "code": "DQ_ANOMALY_METRIC_SCOPE",
                        "type": "anomaly_scope",
                        "row": row_index,
                        "field": "total_count",
                        "message": "字段 total_count 与 arrested_count + not_arrested_count 不一致",
                    }
                )

    return {
        "status": "warn" if alerts else "pass",
        "checked_rows": len(rows),
        "null_issue_count": null_issue_count,
        "anomaly_issue_count": caliber_issue_count,
        "alerts": alerts,
    }


def emit_data_quality_alerts(request_id: str, path: str, alerts: list[Dict[str, Any]]) -> None:
    for alert in alerts:
        logger.warning(
            "data_quality_alert request_id=%s path=%s code=%s field=%s row=%s message=%s",
            request_id,
            path,
            alert.get("code"),
            alert.get("field"),
            alert.get("row"),
            alert.get("message"),
        )


def build_meta(
    filters: Dict[str, Any],
    dimensions: list[str],
    metrics: list[str],
    data: Any,
    sort: Optional[str] = None,
    request_id: str = "unknown",
    request_path: str = "unknown",
) -> Dict[str, Any]:
    data_quality = build_data_quality_report(data=data, dimensions=dimensions, metrics=metrics)
    if data_quality["alerts"]:
        emit_data_quality_alerts(request_id=request_id, path=request_path, alerts=data_quality["alerts"])
    payload = {
        "filters": filters,
        "dimension": dimensions,
        "metrics": metrics,
        "dimension_definitions": build_definitions(dimensions, DIMENSION_DEFINITION_MAP),
        "metric_definitions": build_definitions(metrics, METRIC_DEFINITION_MAP),
        "metric_scope": "after_filters",
        "metric_scope_note": "所有指标基于当前筛选条件聚合",
        "data_quality": data_quality,
        "alerts": data_quality["alerts"],
        "state_contract": build_state_contract(data),
        "generated_at": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "contract_version": CONTRACT_VERSION,
        "api_version": API_VERSION,
    }
    if sort:
        payload["sort"] = sort
    return payload


def build_filter_payload(
    *,
    year: Optional[list[int]] = None,
    start_year: Optional[int] = None,
    end_year: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    primary_type: Optional[list[str]] = None,
    district: Optional[list[int]] = None,
    arrest: Optional[list[bool]] = None,
    month: Optional[list[int]] = None,
    beat: Optional[list[str]] = None,
    ward: Optional[list[int]] = None,
    community_area: Optional[list[int]] = None,
    domestic: Optional[list[bool]] = None,
    limit: Optional[int] = None,
) -> Dict[str, Any]:
    payload = {
        "year": year,
        "start_year": start_year,
        "end_year": end_year,
        "start_date": str(start_date) if start_date else None,
        "end_date": str(end_date) if end_date else None,
        "primary_type": primary_type,
        "district": district,
        "arrest": arrest,
        "month": month,
        "beat": beat,
        "ward": ward,
        "community_area": community_area,
        "domestic": domestic,
    }
    if limit is not None:
        payload["limit"] = limit
    return payload

@router.get("/trend/yearly", response_model=ResponseModel)
def get_trend_yearly(
    request: Request,
    db: Session = Depends(get_db),
    start_year: Optional[int] = Query(None),
    end_year: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    primary_type: Optional[list[str]] = Query(None),
    sort: Literal["asc", "desc"] = Query("asc"),
    district: Optional[list[int]] = Query(None),
    arrest: Optional[list[bool]] = Query(None),
    month: Optional[list[int]] = Query(None),
    beat: Optional[list[str]] = Query(None),
    ward: Optional[list[int]] = Query(None),
    community_area: Optional[list[int]] = Query(None),
    domestic: Optional[list[bool]] = Query(None),
):
    request_id = get_request_id(request)
    if start_year is not None and end_year is not None and start_year > end_year:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "PARAM_VALIDATION_ERROR",
                "message": "start_year 不能大于 end_year",
                "error_type": "parameter_error",
                "details": [{"field": "start_year,end_year", "reason": "年份区间不合法"}],
            },
        )
    sort_value = validate_sort(sort)
    start_dt, end_dt = to_datetime_range(start_date, end_date)
    data = analytics_service.get_yearly_trend(
        db=db,
        start_year=start_year,
        end_year=end_year,
        start_date=start_dt,
        end_date=end_dt,
        primary_type=primary_type,
        sort=sort_value,
        district=district,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
    )
    return ResponseModel(
        data=data,
        meta=build_meta(
            filters=build_filter_payload(
                start_year=start_year,
                end_year=end_year,
                start_date=start_date,
                end_date=end_date,
                primary_type=primary_type,
                district=district,
                arrest=arrest,
                month=month,
                beat=beat,
                ward=ward,
                community_area=community_area,
                domestic=domestic,
            ),
            dimensions=["year"],
            metrics=["count"],
            data=data,
            sort=sort_value,
            request_id=request_id,
            request_path=request.url.path,
        ),
        request_id=request_id,
    )

@router.get("/trend/weekly", response_model=ResponseModel)
def get_trend_weekly(
    request: Request,
    db: Session = Depends(get_db),
    year: Optional[list[int]] = Query(None),
    primary_type: Optional[list[str]] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    district: Optional[list[int]] = Query(None),
    arrest: Optional[list[bool]] = Query(None),
    month: Optional[list[int]] = Query(None),
    beat: Optional[list[str]] = Query(None),
    ward: Optional[list[int]] = Query(None),
    community_area: Optional[list[int]] = Query(None),
    domestic: Optional[list[bool]] = Query(None),
):
    request_id = get_request_id(request)
    start_dt, end_dt = to_datetime_range(start_date, end_date)
    data = analytics_service.get_weekly_trend(
        db,
        year,
        primary_type=primary_type,
        start_date=start_dt,
        end_date=end_dt,
        district=district,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
    )
    return ResponseModel(
        data=data,
        meta=build_meta(
            filters=build_filter_payload(
                year=year,
                start_date=start_date,
                end_date=end_date,
                primary_type=primary_type,
                district=district,
                arrest=arrest,
                month=month,
                beat=beat,
                ward=ward,
                community_area=community_area,
                domestic=domestic,
            ),
            dimensions=["day_of_week"],
            metrics=["count"],
            data=data,
            request_id=request_id,
            request_path=request.url.path,
        ),
        request_id=request_id,
    )

@router.get("/trend/hourly", response_model=ResponseModel)
def get_trend_hourly(
    request: Request,
    db: Session = Depends(get_db),
    year: Optional[list[int]] = Query(None),
    primary_type: Optional[list[str]] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    district: Optional[list[int]] = Query(None),
    arrest: Optional[list[bool]] = Query(None),
    month: Optional[list[int]] = Query(None),
    beat: Optional[list[str]] = Query(None),
    ward: Optional[list[int]] = Query(None),
    community_area: Optional[list[int]] = Query(None),
    domestic: Optional[list[bool]] = Query(None),
):
    request_id = get_request_id(request)
    start_dt, end_dt = to_datetime_range(start_date, end_date)
    data = analytics_service.get_hourly_trend(
        db,
        year,
        primary_type=primary_type,
        start_date=start_dt,
        end_date=end_dt,
        district=district,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
    )
    return ResponseModel(
        data=data,
        meta=build_meta(
            filters=build_filter_payload(
                year=year,
                start_date=start_date,
                end_date=end_date,
                primary_type=primary_type,
                district=district,
                arrest=arrest,
                month=month,
                beat=beat,
                ward=ward,
                community_area=community_area,
                domestic=domestic,
            ),
            dimensions=["hour"],
            metrics=["count"],
            data=data,
            request_id=request_id,
            request_path=request.url.path,
        ),
        request_id=request_id,
    )


@router.get("/trend/nightly_peak", response_model=ResponseModel)
def get_trend_nightly_peak(
    request: Request,
    db: Session = Depends(get_db),
    year: Optional[list[int]] = Query(None),
    primary_type: Optional[list[str]] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    district: Optional[list[int]] = Query(None),
    arrest: Optional[list[bool]] = Query(None),
    month: Optional[list[int]] = Query(None),
    beat: Optional[list[str]] = Query(None),
    ward: Optional[list[int]] = Query(None),
    community_area: Optional[list[int]] = Query(None),
    domestic: Optional[list[bool]] = Query(None),
):
    request_id = get_request_id(request)
    start_dt, end_dt = to_datetime_range(start_date, end_date)
    data = analytics_service.get_night_hourly_peak(
        db,
        year=year,
        primary_type=primary_type,
        start_date=start_dt,
        end_date=end_dt,
        district=district,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
    )
    return ResponseModel(
        data=data,
        meta=build_meta(
            filters=build_filter_payload(
                year=year,
                start_date=start_date,
                end_date=end_date,
                primary_type=primary_type,
                district=district,
                arrest=arrest,
                month=month,
                beat=beat,
                ward=ward,
                community_area=community_area,
                domestic=domestic,
            ),
            dimensions=["hour"],
            metrics=["count"],
            data=data,
            sort="desc",
            request_id=request_id,
            request_path=request.url.path,
        ),
        request_id=request_id,
    )


@router.get("/types/seasonal_compare", response_model=ResponseModel)
def get_types_seasonal_compare(
    request: Request,
    db: Session = Depends(get_db),
    year: Optional[list[int]] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    limit: int = Query(8, ge=LIMIT_MIN, le=LIMIT_MAX),
    district: Optional[list[int]] = Query(None),
    arrest: Optional[list[bool]] = Query(None),
    month: Optional[list[int]] = Query(None),
    beat: Optional[list[str]] = Query(None),
    ward: Optional[list[int]] = Query(None),
    community_area: Optional[list[int]] = Query(None),
    domestic: Optional[list[bool]] = Query(None),
):
    request_id = get_request_id(request)
    start_dt, end_dt = to_datetime_range(start_date, end_date)
    data = analytics_service.get_season_type_distribution(
        db,
        year=year,
        start_date=start_dt,
        end_date=end_dt,
        district=district,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
        limit_per_season=limit,
    )
    return ResponseModel(
        data=data,
        meta=build_meta(
            filters=build_filter_payload(
                year=year,
                start_date=start_date,
                end_date=end_date,
                district=district,
                arrest=arrest,
                month=month,
                beat=beat,
                ward=ward,
                community_area=community_area,
                domestic=domestic,
                limit=limit,
            ),
            dimensions=["season", "primary_type"],
            metrics=["count", "proportion"],
            data=data,
            request_id=request_id,
            request_path=request.url.path,
        ),
        request_id=request_id,
    )


@router.get("/community/top10", response_model=ResponseModel)
def get_community_top10(
    request: Request,
    db: Session = Depends(get_db),
    year: Optional[list[int]] = Query(None),
    primary_type: Optional[list[str]] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    limit: int = Query(10, ge=LIMIT_MIN, le=LIMIT_MAX),
    district: Optional[list[int]] = Query(None),
    arrest: Optional[list[bool]] = Query(None),
    month: Optional[list[int]] = Query(None),
    beat: Optional[list[str]] = Query(None),
    ward: Optional[list[int]] = Query(None),
    community_area: Optional[list[int]] = Query(None),
    domestic: Optional[list[bool]] = Query(None),
):
    request_id = get_request_id(request)
    start_dt, end_dt = to_datetime_range(start_date, end_date)
    data = analytics_service.get_community_area_top(
        db,
        year=year,
        start_date=start_dt,
        end_date=end_dt,
        primary_type=primary_type,
        district=district,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
        limit=limit,
    )
    return ResponseModel(
        data=data,
        meta=build_meta(
            filters=build_filter_payload(
                year=year,
                start_date=start_date,
                end_date=end_date,
                primary_type=primary_type,
                district=district,
                arrest=arrest,
                month=month,
                beat=beat,
                ward=ward,
                community_area=community_area,
                domestic=domestic,
                limit=limit,
            ),
            dimensions=["community_area"],
            metrics=["count"],
            data=data,
            sort="desc",
            request_id=request_id,
            request_path=request.url.path,
        ),
        request_id=request_id,
    )


@router.get("/blocks/top_dangerous", response_model=ResponseModel)
def get_blocks_top_dangerous(
    request: Request,
    db: Session = Depends(get_db),
    year: Optional[list[int]] = Query(None),
    primary_type: Optional[list[str]] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    limit: int = Query(10, ge=LIMIT_MIN, le=LIMIT_MAX),
    district: Optional[list[int]] = Query(None),
    arrest: Optional[list[bool]] = Query(None),
    month: Optional[list[int]] = Query(None),
    beat: Optional[list[str]] = Query(None),
    ward: Optional[list[int]] = Query(None),
    community_area: Optional[list[int]] = Query(None),
    domestic: Optional[list[bool]] = Query(None),
):
    request_id = get_request_id(request)
    start_dt, end_dt = to_datetime_range(start_date, end_date)
    data = analytics_service.get_dangerous_blocks_top(
        db,
        year=year,
        primary_type=primary_type,
        start_date=start_dt,
        end_date=end_dt,
        district=district,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
        limit=limit,
    )
    return ResponseModel(
        data=data,
        meta=build_meta(
            filters=build_filter_payload(
                year=year,
                start_date=start_date,
                end_date=end_date,
                primary_type=primary_type,
                district=district,
                arrest=arrest,
                month=month,
                beat=beat,
                ward=ward,
                community_area=community_area,
                domestic=domestic,
                limit=limit,
            ),
            dimensions=["block"],
            metrics=["count"],
            data=data,
            sort="desc",
            request_id=request_id,
            request_path=request.url.path,
        ),
        request_id=request_id,
    )


@router.get("/districts/type_breakdown", response_model=ResponseModel)
def get_districts_type_breakdown(
    request: Request,
    db: Session = Depends(get_db),
    year: Optional[list[int]] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    district_limit: int = Query(8, ge=LIMIT_MIN, le=LIMIT_MAX),
    type_limit: int = Query(3, ge=1, le=10),
    arrest: Optional[list[bool]] = Query(None),
    month: Optional[list[int]] = Query(None),
    beat: Optional[list[str]] = Query(None),
    ward: Optional[list[int]] = Query(None),
    community_area: Optional[list[int]] = Query(None),
    domestic: Optional[list[bool]] = Query(None),
):
    request_id = get_request_id(request)
    start_dt, end_dt = to_datetime_range(start_date, end_date)
    data = analytics_service.get_district_type_breakdown(
        db,
        year=year,
        start_date=start_dt,
        end_date=end_dt,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
        district_limit=district_limit,
        type_limit=type_limit,
    )
    return ResponseModel(
        data=data,
        meta=build_meta(
            filters=build_filter_payload(
                year=year,
                start_date=start_date,
                end_date=end_date,
                arrest=arrest,
                month=month,
                beat=beat,
                ward=ward,
                community_area=community_area,
                domestic=domestic,
            ),
            dimensions=["district", "primary_type"],
            metrics=["count"],
            data=data,
            request_id=request_id,
            request_path=request.url.path,
        ),
        request_id=request_id,
    )


@router.get("/quality/case_number", response_model=ResponseModel)
def get_quality_case_number(
    request: Request,
    db: Session = Depends(get_db),
    year: Optional[list[int]] = Query(None),
    primary_type: Optional[list[str]] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    district: Optional[list[int]] = Query(None),
    arrest: Optional[list[bool]] = Query(None),
    month: Optional[list[int]] = Query(None),
    beat: Optional[list[str]] = Query(None),
    ward: Optional[list[int]] = Query(None),
    community_area: Optional[list[int]] = Query(None),
    domestic: Optional[list[bool]] = Query(None),
):
    request_id = get_request_id(request)
    start_dt, end_dt = to_datetime_range(start_date, end_date)
    data = analytics_service.get_case_number_quality(
        db,
        year=year,
        primary_type=primary_type,
        start_date=start_dt,
        end_date=end_dt,
        district=district,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
    )
    return ResponseModel(
        data=data,
        meta=build_meta(
            filters=build_filter_payload(
                year=year,
                start_date=start_date,
                end_date=end_date,
                primary_type=primary_type,
                district=district,
                arrest=arrest,
                month=month,
                beat=beat,
                ward=ward,
                community_area=community_area,
                domestic=domestic,
            ),
            dimensions=["status"],
            metrics=["count", "rate"],
            data=data,
            request_id=request_id,
            request_path=request.url.path,
        ),
        request_id=request_id,
    )


@router.get("/types/proportion", response_model=ResponseModel)
def get_types_proportion(
    request: Request,
    db: Session = Depends(get_db),
    year: Optional[list[int]] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    limit: int = Query(10, ge=LIMIT_MIN, le=LIMIT_MAX),
    sort: Literal["asc", "desc"] = Query("desc"),
    district: Optional[list[int]] = Query(None),
    arrest: Optional[list[bool]] = Query(None),
    month: Optional[list[int]] = Query(None),
    beat: Optional[list[str]] = Query(None),
    ward: Optional[list[int]] = Query(None),
    community_area: Optional[list[int]] = Query(None),
    domestic: Optional[list[bool]] = Query(None),
):
    request_id = get_request_id(request)
    sort_value = validate_sort(sort)
    start_dt, end_dt = to_datetime_range(start_date, end_date)
    data = analytics_service.get_types_proportion(
        db,
        year,
        limit,
        sort_value,
        start_dt,
        end_dt,
        district=district,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
    )
    return ResponseModel(
        data=data,
        meta=build_meta(
            filters=build_filter_payload(
                year=year,
                start_date=start_date,
                end_date=end_date,
                district=district,
                arrest=arrest,
                month=month,
                beat=beat,
                ward=ward,
                community_area=community_area,
                domestic=domestic,
                limit=limit,
            ),
            dimensions=["primary_type"],
            metrics=["count"],
            data=data,
            sort=sort_value,
            request_id=request_id,
            request_path=request.url.path,
        ),
        request_id=request_id,
    )

@router.get("/districts/comparison", response_model=ResponseModel)
def get_districts_comparison(
    request: Request,
    db: Session = Depends(get_db),
    year: Optional[list[int]] = Query(None),
    primary_type: Optional[list[str]] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    limit: int = Query(20, ge=LIMIT_MIN, le=LIMIT_MAX),
    sort: Literal["asc", "desc"] = Query("desc"),
    arrest: Optional[list[bool]] = Query(None),
    month: Optional[list[int]] = Query(None),
    beat: Optional[list[str]] = Query(None),
    ward: Optional[list[int]] = Query(None),
    community_area: Optional[list[int]] = Query(None),
    domestic: Optional[list[bool]] = Query(None),
):
    request_id = get_request_id(request)
    sort_value = validate_sort(sort)
    start_dt, end_dt = to_datetime_range(start_date, end_date)
    data = analytics_service.get_districts_comparison(
        db,
        year,
        limit,
        sort_value,
        primary_type=primary_type,
        start_date=start_dt,
        end_date=end_dt,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
    )
    return ResponseModel(
        data=data,
        meta=build_meta(
            filters=build_filter_payload(
                year=year,
                start_date=start_date,
                end_date=end_date,
                primary_type=primary_type,
                arrest=arrest,
                month=month,
                beat=beat,
                ward=ward,
                community_area=community_area,
                domestic=domestic,
                limit=limit,
            ),
            dimensions=["district"],
            metrics=["count"],
            data=data,
            sort=sort_value,
            request_id=request_id,
            request_path=request.url.path,
        ),
        request_id=request_id,
    )

@router.get("/arrests/rate", response_model=ResponseModel)
def get_arrests_rate(
    request: Request,
    db: Session = Depends(get_db),
    year: Optional[list[int]] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    district: Optional[list[int]] = Query(None),
    arrest: Optional[list[bool]] = Query(None),
    month: Optional[list[int]] = Query(None),
    beat: Optional[list[str]] = Query(None),
    ward: Optional[list[int]] = Query(None),
    community_area: Optional[list[int]] = Query(None),
    domestic: Optional[list[bool]] = Query(None),
):
    request_id = get_request_id(request)
    start_dt, end_dt = to_datetime_range(start_date, end_date)
    data = analytics_service.get_arrests_rate(
        db,
        year,
        start_dt,
        end_dt,
        district=district,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
    )
    return ResponseModel(
        data=data,
        meta=build_meta(
            filters=build_filter_payload(
                year=year,
                start_date=start_date,
                end_date=end_date,
                district=district,
                arrest=arrest,
                month=month,
                beat=beat,
                ward=ward,
                community_area=community_area,
                domestic=domestic,
            ),
            dimensions=["arrest"],
            metrics=["count"],
            data=data,
            request_id=request_id,
            request_path=request.url.path,
        ),
        request_id=request_id,
    )

@router.get("/domestic/proportion", response_model=ResponseModel)
def get_domestic_proportion(
    request: Request,
    db: Session = Depends(get_db),
    year: Optional[list[int]] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    district: Optional[list[int]] = Query(None),
    arrest: Optional[list[bool]] = Query(None),
    month: Optional[list[int]] = Query(None),
    beat: Optional[list[str]] = Query(None),
    ward: Optional[list[int]] = Query(None),
    community_area: Optional[list[int]] = Query(None),
    domestic: Optional[list[bool]] = Query(None),
):
    request_id = get_request_id(request)
    start_dt, end_dt = to_datetime_range(start_date, end_date)
    data = analytics_service.get_domestic_proportion(
        db,
        year,
        start_dt,
        end_dt,
        district=district,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
    )
    return ResponseModel(
        data=data,
        meta=build_meta(
            filters=build_filter_payload(
                year=year,
                start_date=start_date,
                end_date=end_date,
                district=district,
                arrest=arrest,
                month=month,
                beat=beat,
                ward=ward,
                community_area=community_area,
                domestic=domestic,
            ),
            dimensions=["domestic"],
            metrics=["count"],
            data=data,
            request_id=request_id,
            request_path=request.url.path,
        ),
        request_id=request_id,
    )

@router.get("/location/types", response_model=ResponseModel)
def get_location_types_top(
    request: Request,
    db: Session = Depends(get_db),
    year: Optional[list[int]] = Query(None),
    primary_type: Optional[list[str]] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    limit: int = Query(10, ge=LIMIT_MIN, le=LIMIT_MAX),
    sort: Literal["asc", "desc"] = Query("desc"),
    district: Optional[list[int]] = Query(None),
    arrest: Optional[list[bool]] = Query(None),
    month: Optional[list[int]] = Query(None),
    beat: Optional[list[str]] = Query(None),
    ward: Optional[list[int]] = Query(None),
    community_area: Optional[list[int]] = Query(None),
    domestic: Optional[list[bool]] = Query(None),
):
    request_id = get_request_id(request)
    sort_value = validate_sort(sort)
    start_dt, end_dt = to_datetime_range(start_date, end_date)
    data = analytics_service.get_location_types_top(
        db,
        year,
        limit,
        sort_value,
        primary_type=primary_type,
        start_date=start_dt,
        end_date=end_dt,
        district=district,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
    )
    return ResponseModel(
        data=data,
        meta=build_meta(
            filters=build_filter_payload(
                year=year,
                start_date=start_date,
                end_date=end_date,
                primary_type=primary_type,
                district=district,
                arrest=arrest,
                month=month,
                beat=beat,
                ward=ward,
                community_area=community_area,
                domestic=domestic,
                limit=limit,
            ),
            dimensions=["location_description"],
            metrics=["count"],
            data=data,
            sort=sort_value,
            request_id=request_id,
            request_path=request.url.path,
        ),
        request_id=request_id,
    )

@router.get("/trend/monthly", response_model=ResponseModel)
def get_trend_monthly(
    request: Request,
    db: Session = Depends(get_db),
    year: int = Query(2023, ge=YEAR_MIN, le=YEAR_MAX),
    primary_type: Optional[list[str]] = Query(None),
    district: Optional[list[int]] = Query(None),
    arrest: Optional[list[bool]] = Query(None),
    month: Optional[list[int]] = Query(None),
    beat: Optional[list[str]] = Query(None),
    ward: Optional[list[int]] = Query(None),
    community_area: Optional[list[int]] = Query(None),
    domestic: Optional[list[bool]] = Query(None),
):
    request_id = get_request_id(request)
    data = analytics_service.get_monthly_trend(
        db,
        year,
        primary_type=primary_type,
        district=district,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
    )
    return ResponseModel(
        data=data,
        meta=build_meta(
            filters=build_filter_payload(
                year=year,
                primary_type=primary_type,
                district=district,
                arrest=arrest,
                month=month,
                beat=beat,
                ward=ward,
                community_area=community_area,
                domestic=domestic,
            ),
            dimensions=["month"],
            metrics=["count"],
            data=data,
            request_id=request_id,
            request_path=request.url.path,
        ),
        request_id=request_id,
    )

@router.get("/types/arrest_rate", response_model=ResponseModel)
def get_types_arrest_rate(
    request: Request,
    db: Session = Depends(get_db),
    year: Optional[list[int]] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    limit: int = Query(10, ge=LIMIT_MIN, le=LIMIT_MAX),
    sort: Literal["asc", "desc"] = Query("desc"),
    district: Optional[list[int]] = Query(None),
    arrest: Optional[list[bool]] = Query(None),
    month: Optional[list[int]] = Query(None),
    beat: Optional[list[str]] = Query(None),
    ward: Optional[list[int]] = Query(None),
    community_area: Optional[list[int]] = Query(None),
    domestic: Optional[list[bool]] = Query(None),
):
    request_id = get_request_id(request)
    sort_value = validate_sort(sort)
    start_dt, end_dt = to_datetime_range(start_date, end_date)
    data = analytics_service.get_types_arrest_rate(
        db,
        year,
        limit,
        sort_value,
        start_dt,
        end_dt,
        district=district,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
    )
    return ResponseModel(
        data=data,
        meta=build_meta(
            filters=build_filter_payload(
                year=year,
                start_date=start_date,
                end_date=end_date,
                district=district,
                arrest=arrest,
                month=month,
                beat=beat,
                ward=ward,
                community_area=community_area,
                domestic=domestic,
                limit=limit,
            ),
            dimensions=["primary_type"],
            metrics=["arrested_count", "not_arrested_count", "total_count", "arrest_rate"],
            data=data,
            sort=sort_value,
            request_id=request_id,
            request_path=request.url.path,
        ),
        request_id=request_id,
    )


@router.get("/filters/options", response_model=ResponseModel)
def get_filter_options(
    request: Request,
    db: Session = Depends(get_db),
    year: Optional[list[int]] = Query(None),
    primary_type: Optional[list[str]] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    district: Optional[list[int]] = Query(None),
    arrest: Optional[list[bool]] = Query(None),
    month: Optional[list[int]] = Query(None),
    beat: Optional[list[str]] = Query(None),
    ward: Optional[list[int]] = Query(None),
    community_area: Optional[list[int]] = Query(None),
    domestic: Optional[list[bool]] = Query(None),
):
    request_id = get_request_id(request)
    start_dt, end_dt = to_datetime_range(start_date, end_date)
    data = analytics_service.get_filter_options(
        db,
        year=year,
        primary_type=primary_type,
        start_date=start_dt,
        end_date=end_dt,
        district=district,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
    )
    return ResponseModel(
        data=data,
        meta=build_meta(
            filters=build_filter_payload(
                year=year,
                start_date=start_date,
                end_date=end_date,
                primary_type=primary_type,
                district=district,
                arrest=arrest,
                month=month,
                beat=beat,
                ward=ward,
                community_area=community_area,
                domestic=domestic,
            ),
            dimensions=[],
            metrics=[],
            data=data,
            request_id=request_id,
            request_path=request.url.path,
        ),
        request_id=request_id,
    )

@router.get("/geo/heatmap", response_model=ResponseModel)
async def get_geo_heatmap_endpoint(
    request: Request,
    year: Optional[list[int]] = Query(None),
    month: Optional[list[int]] = Query(None),
    primary_type: Optional[list[str]] = Query(None),
    district: Optional[list[int]] = Query(None),
    arrest: Optional[list[bool]] = Query(None),
    beat: Optional[list[str]] = Query(None),
    ward: Optional[list[int]] = Query(None),
    community_area: Optional[list[int]] = Query(None),
    domestic: Optional[list[bool]] = Query(None),
    db: Session = Depends(get_db)
):
    data = analytics_service.get_geo_heatmap(
        db,
        year=year,
        month=month,
        primary_type=primary_type,
        district=district,
        arrest=arrest,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
    )
    return {
        "code": "SUCCESS",
        "message": "ok",
        "data": data,
        "meta": {
            "filters": build_filter_payload(
                year=year,
                primary_type=primary_type,
                district=district,
                arrest=arrest,
                month=month,
                beat=beat,
                ward=ward,
                community_area=community_area,
                domestic=domestic,
            ),
            "dimension": ["lat", "lng"],
            "metrics": ["count"],
            "state_contract": build_state_contract(data),
            "data_quality": {"status": "pass", "alerts": []},
            "contract_version": CONTRACT_VERSION,
            "api_version": API_VERSION
        },
        "request_id": get_request_id(request)
    }

@router.get("/geo/districts", response_model=ResponseModel)
async def get_geo_districts_endpoint(
    request: Request,
    year: Optional[list[int]] = Query(None),
    month: Optional[list[int]] = Query(None),
    primary_type: Optional[list[str]] = Query(None),
    district: Optional[list[int]] = Query(None),
    arrest: Optional[list[bool]] = Query(None),
    beat: Optional[list[str]] = Query(None),
    ward: Optional[list[int]] = Query(None),
    community_area: Optional[list[int]] = Query(None),
    domestic: Optional[list[bool]] = Query(None),
    db: Session = Depends(get_db)
):
    data = analytics_service.get_geo_districts(
        db,
        year=year,
        month=month,
        primary_type=primary_type,
        district=district,
        arrest=arrest,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
    )
    return {
        "code": "SUCCESS",
        "message": "ok",
        "data": data,
        "meta": {
            "filters": build_filter_payload(
                year=year,
                primary_type=primary_type,
                district=district,
                arrest=arrest,
                month=month,
                beat=beat,
                ward=ward,
                community_area=community_area,
                domestic=domestic,
            ),
            "dimension": ["district"],
            "metrics": ["count"],
            "state_contract": build_state_contract(data),
            "data_quality": {"status": "pass", "alerts": []},
            "contract_version": CONTRACT_VERSION,
            "api_version": API_VERSION
        },
        "request_id": get_request_id(request)
    }
