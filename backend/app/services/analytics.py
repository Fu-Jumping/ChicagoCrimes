import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import asc, case, desc, func, inspect
from sqlalchemy.orm import Session

from app.database import engine
from app.models.crime import Crime, CrimeDailySummary, CrimeFilterSummary, CrimeLocationSummary, CrimeSummary

B = CrimeSummary
D = CrimeDailySummary
F = CrimeFilterSummary
L = CrimeLocationSummary
_logger = logging.getLogger("chicago_crime_api")

_REQUIRED_SUMMARY_COLUMNS: Dict[str, set[str]] = {
    "crimes_summary": {
        "year",
        "month",
        "primary_type",
        "district",
        "arrest",
        "domestic",
        "crime_count",
    },
    "crimes_filter_summary": {
        "year",
        "month",
        "primary_type",
        "district",
        "beat",
        "ward",
        "community_area",
        "arrest",
        "domestic",
        "crime_count",
    },
    "crimes_location_summary": {
        "year",
        "month",
        "primary_type",
        "district",
        "location_description",
        "arrest",
        "domestic",
        "crime_count",
    },
    "crimes_daily_summary": {
        "crime_date",
        "crime_year",
        "crime_month",
        "primary_type",
        "district",
        "arrest",
        "domestic",
        "crime_count",
    },
}


@dataclass(frozen=True)
class SummaryCapabilities:
    base_summary: bool = False
    filter_summary: bool = False
    location_summary: bool = False
    daily_summary: bool = False

    def any_available(self) -> bool:
        return self.base_summary or self.filter_summary or self.location_summary or self.daily_summary


_summary_capabilities: Optional[SummaryCapabilities] = None


def _load_summary_table_columns() -> Dict[str, set[str]]:
    inspector = inspect(engine)
    table_columns: Dict[str, set[str]] = {}
    for table_name in _REQUIRED_SUMMARY_COLUMNS:
        if not inspector.has_table(table_name):
            continue
        table_columns[table_name] = {
            column["name"] for column in inspector.get_columns(table_name)
        }
    return table_columns


def get_summary_capabilities(force_refresh: bool = False) -> SummaryCapabilities:
    global _summary_capabilities
    if _summary_capabilities is not None and not force_refresh:
        return _summary_capabilities

    try:
        table_columns = _load_summary_table_columns()
        _summary_capabilities = SummaryCapabilities(
            base_summary=_REQUIRED_SUMMARY_COLUMNS["crimes_summary"].issubset(
                table_columns.get("crimes_summary", set())
            ),
            filter_summary=_REQUIRED_SUMMARY_COLUMNS["crimes_filter_summary"].issubset(
                table_columns.get("crimes_filter_summary", set())
            ),
            location_summary=_REQUIRED_SUMMARY_COLUMNS["crimes_location_summary"].issubset(
                table_columns.get("crimes_location_summary", set())
            ),
            daily_summary=_REQUIRED_SUMMARY_COLUMNS["crimes_daily_summary"].issubset(
                table_columns.get("crimes_daily_summary", set())
            ),
        )
        _logger.info(
            "summary capabilities detected base=%s filter=%s location=%s daily=%s",
            _summary_capabilities.base_summary,
            _summary_capabilities.filter_summary,
            _summary_capabilities.location_summary,
            _summary_capabilities.daily_summary,
        )
    except Exception as exc:
        _summary_capabilities = SummaryCapabilities()
        _logger.warning(
            "summary capability detection failed (%s); falling back to raw crimes table",
            str(exc)[:200],
        )
    return _summary_capabilities


def _use_summary() -> bool:
    return get_summary_capabilities().any_available()


def _has_extended_filters(
    *,
    beat: Optional[str] = None,
    ward: Optional[int] = None,
    community_area: Optional[int] = None,
) -> bool:
    return beat is not None or ward is not None or community_area is not None


def can_use_summary_filters(
    *,
    beat: Optional[str] = None,
    ward: Optional[int] = None,
    community_area: Optional[int] = None,
    **_kwargs,
) -> bool:
    return not _has_extended_filters(beat=beat, ward=ward, community_area=community_area)


def add_stable_key(items: List[Dict[str, Any]], key_field: str) -> List[Dict[str, Any]]:
    result: List[Dict[str, Any]] = []
    for item in items:
        key_value = item.get(key_field)
        normalized_key = "" if key_value is None else str(key_value)
        result.append({**item, "key": normalized_key})
    return result


def fill_fixed_buckets(
    items: List[Dict[str, Any]],
    bucket_field: str,
    start: int,
    end: int,
) -> List[Dict[str, Any]]:
    counts = {int(item[bucket_field]): int(item["count"]) for item in items}
    return [{bucket_field: bucket, "count": counts.get(bucket, 0)} for bucket in range(start, end + 1)]


def _can_use_filter_summary_query(
    *,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> bool:
    return start_date is None and end_date is None


def _can_use_base_summary_query(
    *,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    beat: Optional[str] = None,
    ward: Optional[int] = None,
    community_area: Optional[int] = None,
) -> bool:
    return _can_use_filter_summary_query(start_date=start_date, end_date=end_date) and can_use_summary_filters(
        beat=beat,
        ward=ward,
        community_area=community_area,
    )


def _can_use_location_summary_query(
    *,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    beat: Optional[str] = None,
    ward: Optional[int] = None,
    community_area: Optional[int] = None,
) -> bool:
    return _can_use_base_summary_query(
        start_date=start_date,
        end_date=end_date,
        beat=beat,
        ward=ward,
        community_area=community_area,
    )


def _can_use_daily_summary_query(
    *,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    beat: Optional[str] = None,
    ward: Optional[int] = None,
    community_area: Optional[int] = None,
) -> bool:
    return (
        start_date is not None
        and end_date is not None
        and can_use_summary_filters(beat=beat, ward=ward, community_area=community_area)
    )


def _select_general_summary_model(
    *,
    capabilities: SummaryCapabilities,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    beat: Optional[str] = None,
    ward: Optional[int] = None,
    community_area: Optional[int] = None,
):
    if capabilities.filter_summary and _can_use_filter_summary_query(
        start_date=start_date,
        end_date=end_date,
    ):
        if _has_extended_filters(beat=beat, ward=ward, community_area=community_area):
            return F
        if not capabilities.base_summary:
            return F

    if capabilities.base_summary and _can_use_base_summary_query(
        start_date=start_date,
        end_date=end_date,
        beat=beat,
        ward=ward,
        community_area=community_area,
    ):
        return B

    return None


def _select_summary_model_for_period(
    *,
    capabilities: SummaryCapabilities,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    beat: Optional[str] = None,
    ward: Optional[int] = None,
    community_area: Optional[int] = None,
):
    if capabilities.daily_summary and _can_use_daily_summary_query(
        start_date=start_date,
        end_date=end_date,
        beat=beat,
        ward=ward,
        community_area=community_area,
    ):
        return D

    return _select_general_summary_model(
        capabilities=capabilities,
        start_date=start_date,
        end_date=end_date,
        beat=beat,
        ward=ward,
        community_area=community_area,
    )


def _apply_summary_filters(
    query,
    model,
    *,
    start_year=None,
    end_year=None,
    year=None,
    primary_type=None,
    district=None,
    arrest=None,
    month=None,
    beat=None,
    ward=None,
    community_area=None,
    domestic=None,
):
    if start_year is not None:
        query = query.filter(model.year >= start_year)
    if end_year is not None:
        query = query.filter(model.year <= end_year)
    if year is not None:
        query = query.filter(model.year == year)
    if primary_type is not None:
        query = query.filter(model.primary_type == primary_type)
    if district is not None:
        query = query.filter(model.district == str(district))
    if arrest is not None:
        query = query.filter(model.arrest == arrest)
    if month is not None:
        query = query.filter(model.month == month)
    if domestic is not None:
        query = query.filter(model.domestic == domestic)

    if model is F:
        if beat is not None:
            query = query.filter(model.beat == str(beat))
        if ward is not None:
            query = query.filter(model.ward == ward)
        if community_area is not None:
            query = query.filter(model.community_area == community_area)
    elif _has_extended_filters(beat=beat, ward=ward, community_area=community_area):
        raise ValueError("Extended filters require crimes_filter_summary support")

    return query


def _apply_daily_summary_filters(
    query,
    *,
    start_year=None,
    end_year=None,
    year=None,
    primary_type=None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    district=None,
    arrest=None,
    month=None,
    domestic=None,
):
    if start_year is not None:
        query = query.filter(D.crime_year >= start_year)
    if end_year is not None:
        query = query.filter(D.crime_year <= end_year)
    if year is not None:
        query = query.filter(D.crime_year == year)
    if primary_type is not None:
        query = query.filter(D.primary_type == primary_type)
    if start_date is not None:
        query = query.filter(D.crime_date >= start_date.date())
    if end_date is not None:
        query = query.filter(D.crime_date <= end_date.date())
    if district is not None:
        query = query.filter(D.district == str(district))
    if arrest is not None:
        query = query.filter(D.arrest == arrest)
    if month is not None:
        query = query.filter(D.crime_month == month)
    if domestic is not None:
        query = query.filter(D.domestic == domestic)
    return query


def apply_filters(
    query,
    model,
    start_year=None,
    end_year=None,
    year=None,
    primary_type=None,
    start_date=None,
    end_date=None,
    district=None,
    arrest=None,
    month=None,
    beat=None,
    ward=None,
    community_area=None,
    domestic=None,
):
    if start_year is not None:
        query = query.filter(model.year >= start_year)
    if end_year is not None:
        query = query.filter(model.year <= end_year)
    if year is not None:
        query = query.filter(model.year == year)
    if primary_type is not None:
        query = query.filter(model.primary_type == primary_type)
    if start_date is not None:
        query = query.filter(model.date >= start_date)
    if end_date is not None:
        query = query.filter(model.date <= end_date)
    if district is not None:
        query = query.filter(model.district == str(district))
    if arrest is not None:
        query = query.filter(model.arrest == arrest)
    if month is not None:
        query = query.filter(model.crime_month == month)
    if beat is not None:
        query = query.filter(model.beat == str(beat))
    if ward is not None:
        query = query.filter(model.ward == ward)
    if community_area is not None:
        query = query.filter(model.community_area == community_area)
    if domestic is not None:
        query = query.filter(model.domestic == domestic)
    return query


def get_yearly_trend(
    db: Session,
    start_year: Optional[int] = None,
    end_year: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    primary_type: Optional[str] = None,
    sort: str = "asc",
    district: Optional[int] = None,
    arrest: Optional[bool] = None,
    month: Optional[int] = None,
    beat: Optional[str] = None,
    ward: Optional[int] = None,
    community_area: Optional[int] = None,
    domestic: Optional[bool] = None,
) -> List[Dict[str, Any]]:
    capabilities = get_summary_capabilities()
    summary_model = _select_summary_model_for_period(
        capabilities=capabilities,
        start_date=start_date,
        end_date=end_date,
        beat=beat,
        ward=ward,
        community_area=community_area,
    )
    if summary_model is not None:
        if summary_model is D:
            sort_expr = asc(D.crime_year) if sort == "asc" else desc(D.crime_year)
            query = db.query(
                D.crime_year,
                func.sum(D.crime_count).label("count"),
            ).group_by(D.crime_year).order_by(sort_expr)
            query = _apply_daily_summary_filters(
                query,
                start_year=start_year,
                end_year=end_year,
                primary_type=primary_type,
                start_date=start_date,
                end_date=end_date,
                district=district,
                arrest=arrest,
                month=month,
                domestic=domestic,
            )
        else:
            sort_expr = asc(summary_model.year) if sort == "asc" else desc(summary_model.year)
            query = db.query(
                summary_model.year,
                func.sum(summary_model.crime_count).label("count"),
            ).group_by(summary_model.year).order_by(sort_expr)
            query = _apply_summary_filters(
                query,
                summary_model,
                start_year=start_year,
                end_year=end_year,
                primary_type=primary_type,
                district=district,
                arrest=arrest,
                month=month,
                beat=beat,
                ward=ward,
                community_area=community_area,
                domestic=domestic,
            )
        results = query.all()
        data = [
            {
                "year": row.crime_year if hasattr(row, "crime_year") else row.year,
                "count": int(row.count),
            }
            for row in results
            if (row.crime_year if hasattr(row, "crime_year") else row.year) is not None
        ]
        return add_stable_key(data, "year")

    sort_expr = asc(Crime.year) if sort == "asc" else desc(Crime.year)
    query = db.query(Crime.year, func.count(Crime.id).label("count")).group_by(Crime.year).order_by(sort_expr)
    query = apply_filters(
        query,
        Crime,
        start_year=start_year,
        end_year=end_year,
        primary_type=primary_type,
        start_date=start_date,
        end_date=end_date,
        district=district,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
    )
    results = query.all()
    data = [{"year": row.year, "count": row.count} for row in results if row.year is not None]
    return add_stable_key(data, "year")


def get_monthly_trend(
    db: Session,
    year: int,
    primary_type: Optional[str] = None,
    district: Optional[int] = None,
    arrest: Optional[bool] = None,
    month: Optional[int] = None,
    beat: Optional[str] = None,
    ward: Optional[int] = None,
    community_area: Optional[int] = None,
    domestic: Optional[bool] = None,
) -> List[Dict[str, Any]]:
    capabilities = get_summary_capabilities()
    summary_model = _select_general_summary_model(
        capabilities=capabilities,
        beat=beat,
        ward=ward,
        community_area=community_area,
    )
    if summary_model is not None:
        query = db.query(
            summary_model.month,
            func.sum(summary_model.crime_count).label("count"),
        )
        query = _apply_summary_filters(
            query,
            summary_model,
            year=year,
            primary_type=primary_type,
            district=district,
            arrest=arrest,
            month=month,
            beat=beat,
            ward=ward,
            community_area=community_area,
            domestic=domestic,
        )
        query = query.group_by(summary_model.month).order_by(asc(summary_model.month))
        results = query.all()
        data = [{"month": row.month, "count": int(row.count)} for row in results if row.month is not None]
        return add_stable_key(fill_fixed_buckets(data, "month", 1, 12), "month")

    query = db.query(func.month(Crime.date).label("month"), func.count(Crime.id).label("count"))
    query = apply_filters(
        query,
        Crime,
        year=year,
        primary_type=primary_type,
        district=district,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
    )
    query = query.group_by("month").order_by(asc("month"))
    results = query.all()
    data = [{"month": row.month, "count": row.count} for row in results if row.month is not None]
    return add_stable_key(fill_fixed_buckets(data, "month", 1, 12), "month")


def get_weekly_trend(
    db: Session,
    year: Optional[int] = None,
    primary_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    district: Optional[int] = None,
    arrest: Optional[bool] = None,
    month: Optional[int] = None,
    beat: Optional[str] = None,
    ward: Optional[int] = None,
    community_area: Optional[int] = None,
    domestic: Optional[bool] = None,
) -> List[Dict[str, Any]]:
    query = db.query(
        Crime.crime_dow.label("day_of_week_mysql"),
        func.count(Crime.id).label("count"),
    ).group_by(Crime.crime_dow)
    query = apply_filters(
        query,
        Crime,
        year=year,
        primary_type=primary_type,
        start_date=start_date,
        end_date=end_date,
        district=district,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
    )
    results = query.all()

    formatted_results = []
    for row in results:
        if row.day_of_week_mysql is None:
            continue
        day = row.day_of_week_mysql - 2
        if day < 0:
            day = 6
        formatted_results.append({"day_of_week": day, "count": row.count})
    return add_stable_key(fill_fixed_buckets(formatted_results, "day_of_week", 0, 6), "day_of_week")


def get_hourly_trend(
    db: Session,
    year: Optional[int] = None,
    primary_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    district: Optional[int] = None,
    arrest: Optional[bool] = None,
    month: Optional[int] = None,
    beat: Optional[str] = None,
    ward: Optional[int] = None,
    community_area: Optional[int] = None,
    domestic: Optional[bool] = None,
) -> List[Dict[str, Any]]:
    query = db.query(
        Crime.crime_hour.label("hour"),
        func.count(Crime.id).label("count"),
    ).group_by(Crime.crime_hour).order_by(asc(Crime.crime_hour))
    query = apply_filters(
        query,
        Crime,
        year=year,
        primary_type=primary_type,
        start_date=start_date,
        end_date=end_date,
        district=district,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
    )
    results = query.all()
    data = [{"hour": row.hour, "count": row.count} for row in results if row.hour is not None]
    return add_stable_key(fill_fixed_buckets(data, "hour", 0, 23), "hour")


def get_types_proportion(
    db: Session,
    year: Optional[int] = None,
    limit: int = 10,
    sort: str = "desc",
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    district: Optional[int] = None,
    arrest: Optional[bool] = None,
    month: Optional[int] = None,
    beat: Optional[str] = None,
    ward: Optional[int] = None,
    community_area: Optional[int] = None,
    domestic: Optional[bool] = None,
) -> List[Dict[str, Any]]:
    sort_expr = desc("count") if sort == "desc" else asc("count")
    capabilities = get_summary_capabilities()
    summary_model = _select_summary_model_for_period(
        capabilities=capabilities,
        start_date=start_date,
        end_date=end_date,
        beat=beat,
        ward=ward,
        community_area=community_area,
    )
    if summary_model is not None:
        if summary_model is D:
            query = db.query(D.primary_type, func.sum(D.crime_count).label("count"))
            query = query.filter(D.primary_type != "").group_by(D.primary_type)
            query = _apply_daily_summary_filters(
                query,
                year=year,
                start_date=start_date,
                end_date=end_date,
                district=district,
                arrest=arrest,
                month=month,
                domestic=domestic,
            )
            query = query.order_by(sort_expr, asc(D.primary_type)).limit(limit)
        else:
            query = db.query(summary_model.primary_type, func.sum(summary_model.crime_count).label("count"))
            query = query.filter(summary_model.primary_type != "").group_by(summary_model.primary_type)
            query = _apply_summary_filters(
                query,
                summary_model,
                year=year,
                district=district,
                arrest=arrest,
                month=month,
                beat=beat,
                ward=ward,
                community_area=community_area,
                domestic=domestic,
            )
            query = query.order_by(sort_expr, asc(summary_model.primary_type)).limit(limit)
        results = query.all()
        data = [{"primary_type": row.primary_type, "count": int(row.count)} for row in results if row.primary_type]
        return add_stable_key(data, "primary_type")

    query = db.query(Crime.primary_type, func.count(Crime.id).label("count")).group_by(Crime.primary_type)
    query = apply_filters(
        query,
        Crime,
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
    )
    query = query.order_by(sort_expr, asc(Crime.primary_type)).limit(limit)
    results = query.all()
    data = [{"primary_type": row.primary_type, "count": row.count} for row in results if row.primary_type is not None]
    return add_stable_key(data, "primary_type")


def get_districts_comparison(
    db: Session,
    year: Optional[int] = None,
    limit: int = 20,
    sort: str = "desc",
    primary_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    arrest: Optional[bool] = None,
    month: Optional[int] = None,
    beat: Optional[str] = None,
    ward: Optional[int] = None,
    community_area: Optional[int] = None,
    domestic: Optional[bool] = None,
) -> List[Dict[str, Any]]:
    sort_expr = desc("count") if sort == "desc" else asc("count")
    capabilities = get_summary_capabilities()
    summary_model = _select_summary_model_for_period(
        capabilities=capabilities,
        start_date=start_date,
        end_date=end_date,
        beat=beat,
        ward=ward,
        community_area=community_area,
    )
    if summary_model is not None:
        if summary_model is D:
            query = db.query(D.district, func.sum(D.crime_count).label("count"))
            query = query.filter(D.district != "").group_by(D.district)
            query = _apply_daily_summary_filters(
                query,
                year=year,
                primary_type=primary_type,
                start_date=start_date,
                end_date=end_date,
                arrest=arrest,
                month=month,
                domestic=domestic,
            )
            query = query.order_by(sort_expr, asc(D.district)).limit(limit)
        else:
            query = db.query(summary_model.district, func.sum(summary_model.crime_count).label("count"))
            query = query.filter(summary_model.district != "").group_by(summary_model.district)
            query = _apply_summary_filters(
                query,
                summary_model,
                year=year,
                primary_type=primary_type,
                arrest=arrest,
                month=month,
                beat=beat,
                ward=ward,
                community_area=community_area,
                domestic=domestic,
            )
            query = query.order_by(sort_expr, asc(summary_model.district)).limit(limit)
        results = query.all()
        data = [{"district": row.district, "count": int(row.count)} for row in results if row.district and row.district.strip()]
        return add_stable_key(data, "district")

    query = db.query(Crime.district, func.count(Crime.id).label("count")).group_by(Crime.district)
    query = apply_filters(
        query,
        Crime,
        year=year,
        primary_type=primary_type,
        start_date=start_date,
        end_date=end_date,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
    )
    query = query.order_by(sort_expr, asc(Crime.district)).limit(limit)
    results = query.all()
    data = [{"district": row.district, "count": row.count} for row in results if row.district and row.district.strip()]
    return add_stable_key(data, "district")


def get_arrests_rate(
    db: Session,
    year: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    district: Optional[int] = None,
    arrest: Optional[bool] = None,
    month: Optional[int] = None,
    beat: Optional[str] = None,
    ward: Optional[int] = None,
    community_area: Optional[int] = None,
    domestic: Optional[bool] = None,
) -> List[Dict[str, Any]]:
    capabilities = get_summary_capabilities()
    summary_model = _select_summary_model_for_period(
        capabilities=capabilities,
        start_date=start_date,
        end_date=end_date,
        beat=beat,
        ward=ward,
        community_area=community_area,
    )
    if summary_model is not None:
        if summary_model is D:
            query = db.query(D.arrest, func.sum(D.crime_count).label("count")).group_by(D.arrest)
            query = _apply_daily_summary_filters(
                query,
                year=year,
                start_date=start_date,
                end_date=end_date,
                district=district,
                arrest=arrest,
                month=month,
                domestic=domestic,
            )
        else:
            query = db.query(summary_model.arrest, func.sum(summary_model.crime_count).label("count")).group_by(summary_model.arrest)
            query = _apply_summary_filters(
                query,
                summary_model,
                year=year,
                district=district,
                arrest=arrest,
                month=month,
                beat=beat,
                ward=ward,
                community_area=community_area,
                domestic=domestic,
            )
        results = query.all()
        data = [{"arrest": bool(row.arrest), "count": int(row.count)} for row in results if row.arrest is not None]
        return add_stable_key(data, "arrest")

    query = db.query(Crime.arrest, func.count(Crime.id).label("count")).group_by(Crime.arrest)
    query = apply_filters(
        query,
        Crime,
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
    )
    results = query.all()
    data = [{"arrest": bool(row.arrest), "count": row.count} for row in results if row.arrest is not None]
    return add_stable_key(data, "arrest")


def get_domestic_proportion(
    db: Session,
    year: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    district: Optional[int] = None,
    arrest: Optional[bool] = None,
    month: Optional[int] = None,
    beat: Optional[str] = None,
    ward: Optional[int] = None,
    community_area: Optional[int] = None,
    domestic: Optional[bool] = None,
) -> List[Dict[str, Any]]:
    capabilities = get_summary_capabilities()
    summary_model = _select_summary_model_for_period(
        capabilities=capabilities,
        start_date=start_date,
        end_date=end_date,
        beat=beat,
        ward=ward,
        community_area=community_area,
    )
    if summary_model is not None:
        if summary_model is D:
            query = db.query(D.domestic, func.sum(D.crime_count).label("count")).group_by(D.domestic)
            query = _apply_daily_summary_filters(
                query,
                year=year,
                start_date=start_date,
                end_date=end_date,
                district=district,
                arrest=arrest,
                month=month,
                domestic=domestic,
            )
        else:
            query = db.query(summary_model.domestic, func.sum(summary_model.crime_count).label("count")).group_by(summary_model.domestic)
            query = _apply_summary_filters(
                query,
                summary_model,
                year=year,
                district=district,
                arrest=arrest,
                month=month,
                beat=beat,
                ward=ward,
                community_area=community_area,
                domestic=domestic,
            )
        results = query.all()
        data = [{"domestic": bool(row.domestic), "count": int(row.count)} for row in results if row.domestic is not None]
        return add_stable_key(data, "domestic")

    query = db.query(Crime.domestic, func.count(Crime.id).label("count")).group_by(Crime.domestic)
    query = apply_filters(
        query,
        Crime,
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
    )
    results = query.all()
    data = [{"domestic": bool(row.domestic), "count": row.count} for row in results if row.domestic is not None]
    return add_stable_key(data, "domestic")


def get_location_types_top(
    db: Session,
    year: Optional[int] = None,
    limit: int = 10,
    sort: str = "desc",
    primary_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    district: Optional[int] = None,
    arrest: Optional[bool] = None,
    month: Optional[int] = None,
    beat: Optional[str] = None,
    ward: Optional[int] = None,
    community_area: Optional[int] = None,
    domestic: Optional[bool] = None,
) -> List[Dict[str, Any]]:
    sort_expr = desc("count") if sort == "desc" else asc("count")
    capabilities = get_summary_capabilities()
    if capabilities.location_summary and _can_use_location_summary_query(
        start_date=start_date,
        end_date=end_date,
        beat=beat,
        ward=ward,
        community_area=community_area,
    ):
        query = db.query(L.location_description, func.sum(L.crime_count).label("count"))
        query = query.filter(L.location_description != "")
        query = _apply_summary_filters(
            query,
            L,
            year=year,
            primary_type=primary_type,
            district=district,
            arrest=arrest,
            month=month,
            domestic=domestic,
        )
        query = query.group_by(L.location_description)
        query = query.order_by(sort_expr, asc(L.location_description)).limit(limit)
        results = query.all()
        data = [{"location_description": row.location_description, "count": int(row.count)} for row in results if row.location_description is not None]
        return add_stable_key(data, "location_description")

    query = db.query(Crime.location_description, func.count(Crime.id).label("count"))
    query = query.group_by(Crime.location_description)
    query = apply_filters(
        query,
        Crime,
        year=year,
        primary_type=primary_type,
        start_date=start_date,
        end_date=end_date,
        district=district,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
    )
    query = query.order_by(sort_expr, asc(Crime.location_description)).limit(limit)
    results = query.all()
    data = [{"location_description": row.location_description, "count": row.count} for row in results if row.location_description is not None]
    return add_stable_key(data, "location_description")


def get_types_arrest_rate(
    db: Session,
    year: Optional[int] = None,
    limit: int = 10,
    sort: str = "desc",
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    district: Optional[int] = None,
    arrest: Optional[bool] = None,
    month: Optional[int] = None,
    beat: Optional[str] = None,
    ward: Optional[int] = None,
    community_area: Optional[int] = None,
    domestic: Optional[bool] = None,
) -> List[Dict[str, Any]]:
    capabilities = get_summary_capabilities()
    summary_model = _select_summary_model_for_period(
        capabilities=capabilities,
        start_date=start_date,
        end_date=end_date,
        beat=beat,
        ward=ward,
        community_area=community_area,
    )
    if summary_model is not None:
        sort_expr = desc("total") if sort == "desc" else asc("total")
        if summary_model is D:
            query = db.query(
                D.primary_type,
                func.sum(case((D.arrest == 1, D.crime_count), else_=0)).label("arrested"),
                func.sum(case((D.arrest == 0, D.crime_count), else_=0)).label("not_arrested"),
                func.sum(D.crime_count).label("total"),
            ).filter(D.primary_type != "")
            query = _apply_daily_summary_filters(
                query,
                year=year,
                start_date=start_date,
                end_date=end_date,
                district=district,
                arrest=arrest,
                month=month,
                domestic=domestic,
            )
            query = query.group_by(D.primary_type).order_by(sort_expr, asc(D.primary_type)).limit(limit)
        else:
            query = db.query(
                summary_model.primary_type,
                func.sum(case((summary_model.arrest == 1, summary_model.crime_count), else_=0)).label("arrested"),
                func.sum(case((summary_model.arrest == 0, summary_model.crime_count), else_=0)).label("not_arrested"),
                func.sum(summary_model.crime_count).label("total"),
            ).filter(summary_model.primary_type != "")
            query = _apply_summary_filters(
                query,
                summary_model,
                year=year,
                district=district,
                arrest=arrest,
                month=month,
                beat=beat,
                ward=ward,
                community_area=community_area,
                domestic=domestic,
            )
            query = query.group_by(summary_model.primary_type).order_by(sort_expr, asc(summary_model.primary_type)).limit(limit)
        results = query.all()
        final_results = []
        for row in results:
            total = int(row.total)
            arrested_count = int(row.arrested)
            not_arrested_count = int(row.not_arrested)
            if total <= 0:
                continue
            final_results.append(
                {
                    "primary_type": row.primary_type,
                    "arrested_count": arrested_count,
                    "not_arrested_count": not_arrested_count,
                    "total_count": total,
                    "arrest_rate": round(arrested_count / total, 4),
                }
            )
        return add_stable_key(final_results, "primary_type")

    sort_expr = desc("count") if sort == "desc" else asc("count")
    top_types_query = db.query(Crime.primary_type, func.count(Crime.id).label("count")).group_by(Crime.primary_type)
    top_types_query = apply_filters(
        top_types_query,
        Crime,
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
    )
    top_types_query = top_types_query.order_by(sort_expr, asc(Crime.primary_type)).limit(limit)
    top_types = [row.primary_type for row in top_types_query.all() if row.primary_type is not None]
    if not top_types:
        return []

    query = db.query(Crime.primary_type, Crime.arrest, func.count(Crime.id).label("count"))
    query = query.filter(Crime.primary_type.in_(top_types)).group_by(Crime.primary_type, Crime.arrest)
    query = apply_filters(
        query,
        Crime,
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
    )
    results = query.all()
    type_stats = {primary_type: {"arrested": 0, "not_arrested": 0, "total": 0} for primary_type in top_types}
    for row in results:
        if row.primary_type not in type_stats:
            continue
        if row.arrest:
            type_stats[row.primary_type]["arrested"] = row.count
        else:
            type_stats[row.primary_type]["not_arrested"] = row.count
        type_stats[row.primary_type]["total"] += row.count

    final_results = []
    for primary_type, stats in type_stats.items():
        if stats["total"] <= 0:
            continue
        final_results.append(
            {
                "primary_type": primary_type,
                "arrested_count": stats["arrested"],
                "not_arrested_count": stats["not_arrested"],
                "total_count": stats["total"],
                "arrest_rate": round(stats["arrested"] / stats["total"], 4),
            }
        )
    sorted_results = sorted(
        final_results,
        key=lambda item: (item["total_count"], item["primary_type"]),
        reverse=(sort == "desc"),
    )
    return add_stable_key(sorted_results, "primary_type")


def get_geo_heatmap(
    db: Session,
    year: Optional[int] = None,
    month: Optional[int] = None,
    primary_type: Optional[str] = None,
    district: Optional[int] = None,
    arrest: Optional[bool] = None,
    beat: Optional[str] = None,
    ward: Optional[int] = None,
    community_area: Optional[int] = None,
    domestic: Optional[bool] = None,
):
    query = db.query(
        Crime.lat_round3.label("lat"),
        Crime.lng_round3.label("lng"),
        func.count(Crime.id).label("count"),
    ).filter(Crime.lat_round3.isnot(None), Crime.lng_round3.isnot(None))
    query = apply_filters(
        query,
        Crime,
        year=year,
        primary_type=primary_type,
        district=district,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
    )
    query = query.group_by(Crime.lat_round3, Crime.lng_round3)
    results = query.all()
    return [{"lat": row.lat, "lng": row.lng, "count": row.count} for row in results]


def get_geo_districts(
    db: Session,
    year: Optional[int] = None,
    month: Optional[int] = None,
    primary_type: Optional[str] = None,
    district: Optional[int] = None,
    arrest: Optional[bool] = None,
    beat: Optional[str] = None,
    ward: Optional[int] = None,
    community_area: Optional[int] = None,
    domestic: Optional[bool] = None,
):
    capabilities = get_summary_capabilities()
    summary_model = _select_summary_model_for_period(
        capabilities=capabilities,
        start_date=None,
        end_date=None,
        beat=beat,
        ward=ward,
        community_area=community_area,
    )
    if summary_model is not None:
        query = db.query(summary_model.district, func.sum(summary_model.crime_count).label("count")).filter(summary_model.district != "")
        query = _apply_summary_filters(
            query,
            summary_model,
            year=year,
            primary_type=primary_type,
            district=district,
            arrest=arrest,
            month=month,
            beat=beat,
            ward=ward,
            community_area=community_area,
            domestic=domestic,
        )
        query = query.group_by(summary_model.district)
        results = query.all()
        return [{"district": row.district, "count": int(row.count)} for row in results]

    query = db.query(Crime.district, func.count(Crime.id).label("count")).filter(Crime.district.isnot(None))
    query = apply_filters(
        query,
        Crime,
        year=year,
        primary_type=primary_type,
        district=district,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
    )
    query = query.group_by(Crime.district)
    results = query.all()
    return [{"district": row.district, "count": row.count} for row in results]


def _normalize_distinct_values(results) -> List[Any]:
    values: List[Any] = []
    for row in results:
        try:
            value = row[0]
        except (TypeError, KeyError, IndexError):
            value = row
        if isinstance(value, str):
            normalized = value.strip()
            if normalized:
                values.append(normalized)
            continue
        if value is not None:
            if not isinstance(value, bool) and isinstance(value, (int, float)):
                values.append(int(value))
            else:
                values.append(value)
    return values


def _distinct_dimension_values_from_raw(
    db: Session,
    column,
    *,
    year: Optional[int] = None,
    primary_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    district: Optional[int] = None,
    arrest: Optional[bool] = None,
    month: Optional[int] = None,
    beat: Optional[str] = None,
    ward: Optional[int] = None,
    community_area: Optional[int] = None,
    domestic: Optional[bool] = None,
) -> List[Any]:
    query = db.query(column).distinct().filter(column.isnot(None))
    query = apply_filters(
        query,
        Crime,
        year=year,
        primary_type=primary_type,
        start_date=start_date,
        end_date=end_date,
        district=district,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
    )
    results = query.order_by(asc(column)).all()
    return _normalize_distinct_values(results)


def _distinct_dimension_values_from_filter_summary(
    db: Session,
    column,
    *,
    year: Optional[int] = None,
    primary_type: Optional[str] = None,
    district: Optional[int] = None,
    arrest: Optional[bool] = None,
    month: Optional[int] = None,
    beat: Optional[str] = None,
    ward: Optional[int] = None,
    community_area: Optional[int] = None,
    domestic: Optional[bool] = None,
) -> List[Any]:
    query = db.query(column).distinct().filter(column.isnot(None))
    query = _apply_summary_filters(
        query,
        F,
        year=year,
        primary_type=primary_type,
        district=district,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
    )
    results = query.order_by(asc(column)).all()
    return _normalize_distinct_values(results)


def get_filter_options(
    db: Session,
    year: Optional[int] = None,
    primary_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    district: Optional[int] = None,
    arrest: Optional[bool] = None,
    month: Optional[int] = None,
    beat: Optional[str] = None,
    ward: Optional[int] = None,
    community_area: Optional[int] = None,
    domestic: Optional[bool] = None,
) -> Dict[str, Any]:
    capabilities = get_summary_capabilities()
    if capabilities.filter_summary and _can_use_filter_summary_query(start_date=start_date, end_date=end_date):
        beats = _distinct_dimension_values_from_filter_summary(
            db,
            F.beat,
            year=year,
            primary_type=primary_type,
            district=district,
            arrest=arrest,
            month=month,
            ward=ward,
            community_area=community_area,
            domestic=domestic,
        )
        wards = _distinct_dimension_values_from_filter_summary(
            db,
            F.ward,
            year=year,
            primary_type=primary_type,
            district=district,
            arrest=arrest,
            month=month,
            beat=beat,
            community_area=community_area,
            domestic=domestic,
        )
        community_areas = _distinct_dimension_values_from_filter_summary(
            db,
            F.community_area,
            year=year,
            primary_type=primary_type,
            district=district,
            arrest=arrest,
            month=month,
            beat=beat,
            ward=ward,
            domestic=domestic,
        )
    else:
        beats = _distinct_dimension_values_from_raw(
            db,
            Crime.beat,
            year=year,
            primary_type=primary_type,
            start_date=start_date,
            end_date=end_date,
            district=district,
            arrest=arrest,
            month=month,
            ward=ward,
            community_area=community_area,
            domestic=domestic,
        )
        wards = _distinct_dimension_values_from_raw(
            db,
            Crime.ward,
            year=year,
            primary_type=primary_type,
            start_date=start_date,
            end_date=end_date,
            district=district,
            arrest=arrest,
            month=month,
            beat=beat,
            community_area=community_area,
            domestic=domestic,
        )
        community_areas = _distinct_dimension_values_from_raw(
            db,
            Crime.community_area,
            year=year,
            primary_type=primary_type,
            start_date=start_date,
            end_date=end_date,
            district=district,
            arrest=arrest,
            month=month,
            beat=beat,
            ward=ward,
            domestic=domestic,
        )

    return {
        "months": list(range(1, 13)),
        "beats": beats,
        "wards": wards,
        "community_areas": community_areas,
        "domestic_values": [True, False],
    }
