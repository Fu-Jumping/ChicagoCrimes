import logging
from calendar import monthrange
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import asc, case, desc, func, inspect
from sqlalchemy.orm import Session

from app.database import engine
from app.models.crime import (
    Crime,
    CrimeDailySummary,
    CrimeFilterSummary,
    CrimeLocationDailySummary,
    CrimeLocationPeriodSummary,
    CrimeLocationRollupSummary,
    CrimeLocationSummary,
    CrimeSummary,
)

B = CrimeSummary
D = CrimeDailySummary
F = CrimeFilterSummary
L = CrimeLocationSummary
LD = CrimeLocationDailySummary
LP = CrimeLocationPeriodSummary
LR = CrimeLocationRollupSummary
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
    "crimes_location_rollup_summary": {
        "location_description",
        "crime_count",
    },
    "crimes_location_period_summary": {
        "year",
        "month",
        "location_description",
        "crime_count",
    },
    "crimes_location_daily_summary": {
        "crime_date",
        "crime_year",
        "crime_month",
        "location_description",
        "crime_count",
    },
}


@dataclass(frozen=True)
class SummaryCapabilities:
    base_summary: bool = False
    filter_summary: bool = False
    location_summary: bool = False
    daily_summary: bool = False
    location_rollup_summary: bool = False
    location_period_summary: bool = False
    location_daily_summary: bool = False

    def any_available(self) -> bool:
        return (
            self.base_summary
            or self.filter_summary
            or self.location_summary
            or self.daily_summary
            or self.location_rollup_summary
            or self.location_period_summary
            or self.location_daily_summary
        )


_summary_capabilities: Optional[SummaryCapabilities] = None


def reset_summary_capabilities_cache() -> None:
    """Call after database engine is reconfigured (e.g. setup wizard)."""
    global _summary_capabilities
    _summary_capabilities = None


def _load_summary_table_columns() -> Dict[str, set[str]]:
    if engine is None:
        return {}
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
            location_rollup_summary=_REQUIRED_SUMMARY_COLUMNS["crimes_location_rollup_summary"].issubset(
                table_columns.get("crimes_location_rollup_summary", set())
            ),
            location_period_summary=_REQUIRED_SUMMARY_COLUMNS["crimes_location_period_summary"].issubset(
                table_columns.get("crimes_location_period_summary", set())
            ),
            location_daily_summary=_REQUIRED_SUMMARY_COLUMNS["crimes_location_daily_summary"].issubset(
                table_columns.get("crimes_location_daily_summary", set())
            ),
        )
        _logger.info(
            "summary capabilities detected base=%s filter=%s location=%s daily=%s location_rollup=%s location_period=%s location_daily=%s",
            _summary_capabilities.base_summary,
            _summary_capabilities.filter_summary,
            _summary_capabilities.location_summary,
            _summary_capabilities.daily_summary,
            _summary_capabilities.location_rollup_summary,
            _summary_capabilities.location_period_summary,
            _summary_capabilities.location_daily_summary,
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
    beat=None,
    ward=None,
    community_area=None,
) -> bool:
    return bool(beat) or bool(ward) or bool(community_area)


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


def _matches_single_filter_value(filter_value, expected: int) -> bool:
    if filter_value is None:
        return True
    if isinstance(filter_value, list):
        return len(filter_value) == 1 and int(filter_value[0]) == expected
    return int(filter_value) == expected


def _normalize_aligned_time_filters(
    *,
    year=None,
    month=None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
):
    if start_date is None or end_date is None:
        return year, month, start_date, end_date

    start_day = start_date.date()
    end_day = end_date.date()

    if (
        start_day.year == end_day.year
        and start_day.month == end_day.month
        and start_day.day == 1
        and end_day.day == monthrange(start_day.year, start_day.month)[1]
        and _matches_single_filter_value(year, start_day.year)
        and _matches_single_filter_value(month, start_day.month)
    ):
        return (
            year if year is not None else start_day.year,
            month if month is not None else start_day.month,
            None,
            None,
        )

    if (
        start_day.year == end_day.year
        and start_day.month == 1
        and start_day.day == 1
        and end_day.month == 12
        and end_day.day == 31
        and month is None
        and _matches_single_filter_value(year, start_day.year)
    ):
        return (
            year if year is not None else start_day.year,
            month,
            None,
            None,
        )

    return year, month, start_date, end_date


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


def _has_location_common_dimension_filters(
    *,
    primary_type=None,
    district=None,
    arrest=None,
    domestic=None,
) -> bool:
    return any(value is not None for value in (primary_type, district, arrest, domestic))


def _has_any_location_filters(
    *,
    year=None,
    primary_type=None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    district=None,
    arrest=None,
    month=None,
    beat=None,
    ward=None,
    community_area=None,
    domestic=None,
) -> bool:
    return any(
        value is not None
        for value in (
            year,
            primary_type,
            start_date,
            end_date,
            district,
            arrest,
            month,
            beat,
            ward,
            community_area,
            domestic,
        )
    )


def _can_use_location_rollup_summary_query(
    *,
    year=None,
    primary_type=None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    district=None,
    arrest=None,
    month=None,
    beat=None,
    ward=None,
    community_area=None,
    domestic=None,
) -> bool:
    return not _has_any_location_filters(
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


def _can_use_location_period_summary_query(
    *,
    year=None,
    primary_type=None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    district=None,
    arrest=None,
    month=None,
    beat=None,
    ward=None,
    community_area=None,
    domestic=None,
) -> bool:
    if start_date is not None or end_date is not None:
        return False
    if _has_extended_filters(beat=beat, ward=ward, community_area=community_area):
        return False
    if _has_location_common_dimension_filters(
        primary_type=primary_type,
        district=district,
        arrest=arrest,
        domestic=domestic,
    ):
        return False
    return year is not None or month is not None


def _can_use_location_daily_summary_query(
    *,
    primary_type=None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    district=None,
    arrest=None,
    beat=None,
    ward=None,
    community_area=None,
    domestic=None,
) -> bool:
    if start_date is None or end_date is None:
        return False
    if _has_extended_filters(beat=beat, ward=ward, community_area=community_area):
        return False
    return not _has_location_common_dimension_filters(
        primary_type=primary_type,
        district=district,
        arrest=arrest,
        domestic=domestic,
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
        query = query.filter(model.year.in_(year) if isinstance(year, list) else model.year == year)
    if primary_type is not None:
        query = query.filter(model.primary_type.in_(primary_type) if isinstance(primary_type, list) else model.primary_type == primary_type)
    if district is not None:
        query = query.filter(model.district.in_(_normalize_district_filter_values(district)))
    if arrest is not None:
        query = query.filter(model.arrest.in_(arrest) if isinstance(arrest, list) else model.arrest == arrest)
    if month is not None:
        query = query.filter(model.month.in_(month) if isinstance(month, list) else model.month == month)
    if domestic is not None:
        query = query.filter(model.domestic.in_(domestic) if isinstance(domestic, list) else model.domestic == domestic)

    if model is F:
        if beat is not None:
            query = query.filter(model.beat.in_(_normalize_beat_filter_values(beat)))
        if ward is not None:
            query = query.filter(model.ward.in_(ward) if isinstance(ward, list) else model.ward == ward)
        if community_area is not None:
            query = query.filter(model.community_area.in_(community_area) if isinstance(community_area, list) else model.community_area == community_area)
    elif _has_extended_filters(beat=beat, ward=ward, community_area=community_area):
        raise ValueError("Extended filters require crimes_filter_summary support")

    return query


def _normalize_district_filter_values(district) -> list[str]:
    raw_values = district if isinstance(district, list) else [district]
    normalized: list[str] = []
    for value in raw_values:
        text = str(value).strip()
        if not text:
            continue
        normalized.append(text)
        if text.isdigit():
            normalized.append(text.zfill(3))
    return list(dict.fromkeys(normalized))


def _normalize_beat_filter_values(beat) -> list[str]:
    raw_values = beat if isinstance(beat, list) else [beat]
    normalized: list[str] = []
    for value in raw_values:
        text = str(value).strip()
        if not text:
            continue
        normalized.append(text)
        if text.isdigit():
            normalized.append(text.zfill(4))
    return list(dict.fromkeys(normalized))


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
        query = query.filter(D.crime_year.in_(year) if isinstance(year, list) else D.crime_year == year)
    if primary_type is not None:
        query = query.filter(D.primary_type.in_(primary_type) if isinstance(primary_type, list) else D.primary_type == primary_type)
    if start_date is not None:
        query = query.filter(D.crime_date >= start_date.date())
    if end_date is not None:
        query = query.filter(D.crime_date <= end_date.date())
    if district is not None:
        query = query.filter(D.district.in_(_normalize_district_filter_values(district)))
    if arrest is not None:
        query = query.filter(D.arrest.in_(arrest) if isinstance(arrest, list) else D.arrest == arrest)
    if month is not None:
        query = query.filter(D.crime_month.in_(month) if isinstance(month, list) else D.crime_month == month)
    if domestic is not None:
        query = query.filter(D.domestic.in_(domestic) if isinstance(domestic, list) else D.domestic == domestic)
    return query


def _apply_location_period_summary_filters(
    query,
    *,
    year=None,
    month=None,
):
    if year is not None:
        query = query.filter(LP.year.in_(year) if isinstance(year, list) else LP.year == year)
    if month is not None:
        query = query.filter(LP.month.in_(month) if isinstance(month, list) else LP.month == month)
    return query


def _apply_location_daily_summary_filters(
    query,
    *,
    year=None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    month=None,
):
    if year is not None:
        query = query.filter(LD.crime_year.in_(year) if isinstance(year, list) else LD.crime_year == year)
    if start_date is not None:
        query = query.filter(LD.crime_date >= start_date.date())
    if end_date is not None:
        query = query.filter(LD.crime_date <= end_date.date())
    if month is not None:
        query = query.filter(LD.crime_month.in_(month) if isinstance(month, list) else LD.crime_month == month)
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
        query = query.filter(model.year.in_(year) if isinstance(year, list) else model.year == year)
    if primary_type is not None:
        query = query.filter(model.primary_type.in_(primary_type) if isinstance(primary_type, list) else model.primary_type == primary_type)
    if start_date is not None:
        query = query.filter(model.date >= start_date)
    if end_date is not None:
        query = query.filter(model.date <= end_date)
    if district is not None:
        query = query.filter(model.district.in_(_normalize_district_filter_values(district)))
    if arrest is not None:
        query = query.filter(model.arrest.in_(arrest) if isinstance(arrest, list) else model.arrest == arrest)
    if month is not None:
        query = query.filter(model.crime_month.in_(month) if isinstance(month, list) else model.crime_month == month)
    if beat is not None:
        query = query.filter(model.beat.in_(_normalize_beat_filter_values(beat)))
    if ward is not None:
        query = query.filter(model.ward.in_(ward) if isinstance(ward, list) else model.ward == ward)
    if community_area is not None:
        query = query.filter(model.community_area.in_(community_area) if isinstance(community_area, list) else model.community_area == community_area)
    if domestic is not None:
        query = query.filter(model.domestic.in_(domestic) if isinstance(domestic, list) else model.domestic == domestic)
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
    year, month, start_date, end_date = _normalize_aligned_time_filters(
        year=year,
        month=month,
        start_date=start_date,
        end_date=end_date,
    )
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
    year, month, start_date, end_date = _normalize_aligned_time_filters(
        year=year,
        month=month,
        start_date=start_date,
        end_date=end_date,
    )
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
    year, month, start_date, end_date = _normalize_aligned_time_filters(
        year=year,
        month=month,
        start_date=start_date,
        end_date=end_date,
    )
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
    year, month, start_date, end_date = _normalize_aligned_time_filters(
        year=year,
        month=month,
        start_date=start_date,
        end_date=end_date,
    )
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
    year, month, start_date, end_date = _normalize_aligned_time_filters(
        year=year,
        month=month,
        start_date=start_date,
        end_date=end_date,
    )
    sort_expr = desc("count") if sort == "desc" else asc("count")
    capabilities = get_summary_capabilities()
    if capabilities.location_rollup_summary and _can_use_location_rollup_summary_query(
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
    ):
        location_column = LR.__table__.c.location_description
        count_column = LR.__table__.c.crime_count
        query = db.query(location_column, count_column.label("count"))
        query = query.filter(location_column != "")
        query = query.order_by(desc(count_column) if sort == "desc" else asc(count_column), asc(location_column)).limit(limit)
        results = query.all()
        data = [{"location_description": row.location_description, "count": int(row.count)} for row in results if row.location_description is not None]
        return add_stable_key(data, "location_description")

    if capabilities.location_period_summary and _can_use_location_period_summary_query(
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
    ):
        location_column = LP.__table__.c.location_description
        query = db.query(location_column, func.sum(LP.crime_count).label("count"))
        query = query.filter(location_column != "")
        query = _apply_location_period_summary_filters(query, year=year, month=month)
        query = query.group_by(location_column)
        query = query.order_by(sort_expr, asc(location_column)).limit(limit)
        results = query.all()
        data = [{"location_description": row.location_description, "count": int(row.count)} for row in results if row.location_description is not None]
        return add_stable_key(data, "location_description")

    if capabilities.location_daily_summary and _can_use_location_daily_summary_query(
        primary_type=primary_type,
        start_date=start_date,
        end_date=end_date,
        district=district,
        arrest=arrest,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
    ):
        location_column = LD.__table__.c.location_description
        query = db.query(location_column, func.sum(LD.crime_count).label("count"))
        query = query.filter(location_column != "")
        query = _apply_location_daily_summary_filters(
            query,
            year=year,
            start_date=start_date,
            end_date=end_date,
            month=month,
        )
        query = query.group_by(location_column)
        query = query.order_by(sort_expr, asc(location_column)).limit(limit)
        results = query.all()
        data = [{"location_description": row.location_description, "count": int(row.count)} for row in results if row.location_description is not None]
        return add_stable_key(data, "location_description")

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
    year, month, start_date, end_date = _normalize_aligned_time_filters(
        year=year,
        month=month,
        start_date=start_date,
        end_date=end_date,
    )
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


def get_night_hourly_peak(
    db: Session,
    year: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    primary_type: Optional[str] = None,
    district: Optional[int] = None,
    arrest: Optional[bool] = None,
    month: Optional[int] = None,
    beat: Optional[str] = None,
    ward: Optional[int] = None,
    community_area: Optional[int] = None,
    domestic: Optional[bool] = None,
) -> List[Dict[str, Any]]:
    night_hours = [22, 23, 0, 1, 2, 3]
    query = db.query(Crime.crime_hour.label("hour"), func.count(Crime.id).label("count"))
    query = query.filter(Crime.crime_hour.in_(night_hours))
    query = apply_filters(
        query,
        Crime,
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
    )
    query = query.group_by(Crime.crime_hour).order_by(asc(Crime.crime_hour))
    results = query.all()

    hour_counts = {int(row.hour): int(row.count) for row in results if row.hour is not None}
    
    data = []
    for h in night_hours:
        data.append({"hour": h, "count": hour_counts.get(h, 0)})
        
    return add_stable_key(data, "hour")


def get_season_type_distribution(
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
    limit_per_season: int = 8,
) -> List[Dict[str, Any]]:
    year, month, start_date, end_date = _normalize_aligned_time_filters(
        year=year,
        month=month,
        start_date=start_date,
        end_date=end_date,
    )
    season_months = {
        "winter": {12, 1, 2},
        "summer": {6, 7, 8},
    }
    capabilities = get_summary_capabilities()
    summary_model = _select_summary_model_for_period(
        capabilities=capabilities,
        start_date=start_date,
        end_date=end_date,
        beat=beat,
        ward=ward,
        community_area=community_area,
    )
    if summary_model is D:
        daily_month_column = D.__table__.c.crime_month
        daily_type_column = D.__table__.c.primary_type
        query = db.query(
            daily_month_column,
            daily_type_column,
            func.sum(D.crime_count).label("count"),
        ).filter(D.primary_type.isnot(None), D.primary_type != "")
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
        query = query.group_by(daily_month_column, daily_type_column)
    elif summary_model is not None:
        summary_month_column = summary_model.__table__.c.month
        summary_type_column = summary_model.__table__.c.primary_type
        query = db.query(
            summary_month_column,
            summary_type_column,
            func.sum(summary_model.crime_count).label("count"),
        ).filter(summary_model.primary_type.isnot(None), summary_model.primary_type != "")
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
        query = query.group_by(summary_month_column, summary_type_column)
    else:
        query = db.query(
            Crime.crime_month.label("month"),
            Crime.primary_type.label("primary_type"),
            func.count(Crime.id).label("count"),
        ).filter(Crime.primary_type.isnot(None), Crime.primary_type != "")
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
        query = query.group_by(Crime.crime_month, Crime.primary_type)
    results = query.all()

    season_type_counts: Dict[str, Dict[str, int]] = {"winter": {}, "summer": {}}
    season_totals: Dict[str, int] = {"winter": 0, "summer": 0}

    for row in results:
        row_month = getattr(row, "month", getattr(row, "crime_month", None))
        if row_month is None or not row.primary_type:
            continue
        season = None
        if int(row_month) in season_months["winter"]:
            season = "winter"
        elif int(row_month) in season_months["summer"]:
            season = "summer"
        if season is None:
            continue
        count_value = int(row.count)
        season_type_counts[season][row.primary_type] = season_type_counts[season].get(row.primary_type, 0) + count_value
        season_totals[season] += count_value

    final_results: List[Dict[str, Any]] = []
    for season in ("winter", "summer"):
        total = season_totals[season]
        if total <= 0:
            continue
        top_items = sorted(
            season_type_counts[season].items(),
            key=lambda item: (-item[1], item[0]),
        )[:limit_per_season]
        for primary_type, count_value in top_items:
            final_results.append(
                {
                    "season": season,
                    "primary_type": primary_type,
                    "count": count_value,
                    "proportion": round(count_value / total, 4),
                    "key": f"{season}-{primary_type}",
                }
            )
    return final_results


def get_community_area_top(
    db: Session,
    year: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    primary_type: Optional[str] = None,
    district: Optional[int] = None,
    arrest: Optional[bool] = None,
    month: Optional[int] = None,
    beat: Optional[str] = None,
    ward: Optional[int] = None,
    community_area: Optional[int] = None,
    domestic: Optional[bool] = None,
    limit: int = 10,
) -> List[Dict[str, Any]]:
    query = db.query(Crime.community_area, func.count(Crime.id).label("count"))
    query = query.filter(Crime.community_area.isnot(None))
    query = apply_filters(
        query,
        Crime,
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
    )
    query = query.group_by(Crime.community_area).order_by(desc("count"), asc(Crime.community_area)).limit(limit)
    results = query.all()
    data = [{"community_area": int(row.community_area), "count": int(row.count)} for row in results if row.community_area is not None]
    return add_stable_key(data, "community_area")


def get_district_type_breakdown(
    db: Session,
    year: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    arrest: Optional[bool] = None,
    month: Optional[int] = None,
    beat: Optional[str] = None,
    ward: Optional[int] = None,
    community_area: Optional[int] = None,
    domestic: Optional[bool] = None,
    district_limit: int = 8,
    type_limit: int = 3,
) -> List[Dict[str, Any]]:
    year, month, start_date, end_date = _normalize_aligned_time_filters(
        year=year,
        month=month,
        start_date=start_date,
        end_date=end_date,
    )
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
            district_query = db.query(D.district, func.sum(D.crime_count).label("count")).filter(
                D.district.isnot(None), D.district != ""
            )
            district_query = _apply_daily_summary_filters(
                district_query,
                year=year,
                start_date=start_date,
                end_date=end_date,
                arrest=arrest,
                month=month,
                domestic=domestic,
            )
            district_query = district_query.group_by(D.district).order_by(desc("count"), asc(D.district)).limit(district_limit)
            top_districts = [row.district for row in district_query.all() if row.district]
            if not top_districts:
                return []

            type_query = db.query(D.primary_type, func.sum(D.crime_count).label("count")).filter(
                D.primary_type.isnot(None), D.primary_type != "", D.district.in_(top_districts)
            )
            type_query = _apply_daily_summary_filters(
                type_query,
                year=year,
                start_date=start_date,
                end_date=end_date,
                arrest=arrest,
                month=month,
                domestic=domestic,
            )
            type_query = type_query.group_by(D.primary_type).order_by(desc("count"), asc(D.primary_type)).limit(type_limit)
            top_types = [row.primary_type for row in type_query.all() if row.primary_type]
            if not top_types:
                return []

            breakdown_query = db.query(
                D.district,
                D.primary_type,
                func.sum(D.crime_count).label("count"),
            ).filter(
                D.district.in_(top_districts),
                D.primary_type.in_(top_types),
            )
            breakdown_query = _apply_daily_summary_filters(
                breakdown_query,
                year=year,
                start_date=start_date,
                end_date=end_date,
                arrest=arrest,
                month=month,
                domestic=domestic,
            )
            breakdown_query = breakdown_query.group_by(D.district, D.primary_type)
        else:
            district_query = db.query(summary_model.district, func.sum(summary_model.crime_count).label("count")).filter(
                summary_model.district.isnot(None), summary_model.district != ""
            )
            district_query = _apply_summary_filters(
                district_query,
                summary_model,
                year=year,
                arrest=arrest,
                month=month,
                beat=beat,
                ward=ward,
                community_area=community_area,
                domestic=domestic,
            )
            district_query = district_query.group_by(summary_model.district).order_by(desc("count"), asc(summary_model.district)).limit(district_limit)
            top_districts = [row.district for row in district_query.all() if row.district]
            if not top_districts:
                return []

            type_query = db.query(summary_model.primary_type, func.sum(summary_model.crime_count).label("count")).filter(
                summary_model.primary_type.isnot(None), summary_model.primary_type != "", summary_model.district.in_(top_districts)
            )
            type_query = _apply_summary_filters(
                type_query,
                summary_model,
                year=year,
                arrest=arrest,
                month=month,
                beat=beat,
                ward=ward,
                community_area=community_area,
                domestic=domestic,
            )
            type_query = type_query.group_by(summary_model.primary_type).order_by(desc("count"), asc(summary_model.primary_type)).limit(type_limit)
            top_types = [row.primary_type for row in type_query.all() if row.primary_type]
            if not top_types:
                return []

            breakdown_query = db.query(
                summary_model.district,
                summary_model.primary_type,
                func.sum(summary_model.crime_count).label("count"),
            ).filter(
                summary_model.district.in_(top_districts),
                summary_model.primary_type.in_(top_types),
            )
            breakdown_query = _apply_summary_filters(
                breakdown_query,
                summary_model,
                year=year,
                arrest=arrest,
                month=month,
                beat=beat,
                ward=ward,
                community_area=community_area,
                domestic=domestic,
            )
            breakdown_query = breakdown_query.group_by(summary_model.district, summary_model.primary_type)

        results = breakdown_query.all()
        data = [
            {
                "district": row.district,
                "primary_type": row.primary_type,
                "count": int(row.count),
                "key": f"{row.district}-{row.primary_type}",
            }
            for row in results
            if row.district and row.primary_type
        ]
        return sorted(data, key=lambda item: (top_districts.index(item["district"]), -item["count"], item["primary_type"]))

    district_query = db.query(Crime.district, func.count(Crime.id).label("count")).filter(
        Crime.district.isnot(None), Crime.district != ""
    )
    district_query = apply_filters(
        district_query,
        Crime,
        year=year,
        start_date=start_date,
        end_date=end_date,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
    )
    district_query = district_query.group_by(Crime.district).order_by(desc("count"), asc(Crime.district)).limit(district_limit)
    top_districts = [row.district for row in district_query.all() if row.district]
    if not top_districts:
        return []

    type_query = db.query(Crime.primary_type, func.count(Crime.id).label("count")).filter(
        Crime.primary_type.isnot(None), Crime.primary_type != "", Crime.district.in_(top_districts)
    )
    type_query = apply_filters(
        type_query,
        Crime,
        year=year,
        start_date=start_date,
        end_date=end_date,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
    )
    type_query = type_query.group_by(Crime.primary_type).order_by(desc("count"), asc(Crime.primary_type)).limit(type_limit)
    top_types = [row.primary_type for row in type_query.all() if row.primary_type]
    if not top_types:
        return []

    breakdown_query = db.query(
        Crime.district,
        Crime.primary_type,
        func.count(Crime.id).label("count"),
    ).filter(
        Crime.district.in_(top_districts),
        Crime.primary_type.in_(top_types),
    )
    breakdown_query = apply_filters(
        breakdown_query,
        Crime,
        year=year,
        start_date=start_date,
        end_date=end_date,
        arrest=arrest,
        month=month,
        beat=beat,
        ward=ward,
        community_area=community_area,
        domestic=domestic,
    )
    breakdown_query = breakdown_query.group_by(Crime.district, Crime.primary_type)
    results = breakdown_query.all()
    data = [
        {
            "district": row.district,
            "primary_type": row.primary_type,
            "count": int(row.count),
            "key": f"{row.district}-{row.primary_type}",
        }
        for row in results
        if row.district and row.primary_type
    ]
    return sorted(data, key=lambda item: (top_districts.index(item["district"]), -item["count"], item["primary_type"]))


def get_dangerous_blocks_top(
    db: Session,
    year: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    primary_type: Optional[str] = None,
    district: Optional[int] = None,
    arrest: Optional[bool] = None,
    month: Optional[int] = None,
    beat: Optional[str] = None,
    ward: Optional[int] = None,
    community_area: Optional[int] = None,
    domestic: Optional[bool] = None,
    limit: int = 10,
) -> List[Dict[str, Any]]:
    query = db.query(Crime.block.label("block"), func.count(Crime.id).label("count")).filter(
        Crime.block.isnot(None), Crime.block != ""
    )
    query = apply_filters(
        query,
        Crime,
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
    )
    query = query.group_by(Crime.block).order_by(desc("count"), asc(Crime.block)).limit(limit)
    results = query.all()
    data = [{"block": row.block, "count": int(row.count)} for row in results if row.block]
    return add_stable_key(data, "block")


def get_case_number_quality(
    db: Session,
    year: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    primary_type: Optional[str] = None,
    district: Optional[int] = None,
    arrest: Optional[bool] = None,
    month: Optional[int] = None,
    beat: Optional[str] = None,
    ward: Optional[int] = None,
    community_area: Optional[int] = None,
    domestic: Optional[bool] = None,
) -> List[Dict[str, Any]]:
    case_regex = r"^[A-Z]{2}[0-9]{6,}$"
    missing_condition = (Crime.case_number.is_(None)) | (func.trim(Crime.case_number) == "")

    total_query = apply_filters(
        db.query(func.count(Crime.id)),
        Crime,
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
    )
    total_count = int(total_query.scalar() or 0)
    if total_count <= 0:
        return []

    missing_query = apply_filters(
        db.query(func.count(Crime.id)).filter(missing_condition),
        Crime,
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
    )
    missing_count = int(missing_query.scalar() or 0)

    invalid_query = apply_filters(
        db.query(func.count(Crime.id)).filter(~missing_condition, ~Crime.case_number.op("REGEXP")(case_regex)),
        Crime,
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
    )
    invalid_count = int(invalid_query.scalar() or 0)

    duplicate_query = apply_filters(
        db.query(
            Crime.case_number.label("case_number"),
            func.count(Crime.id).label("case_count"),
        ).filter(~missing_condition, Crime.case_number.op("REGEXP")(case_regex)),
        Crime,
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
    )
    duplicate_rows = duplicate_query.group_by(Crime.case_number).having(func.count(Crime.id) > 1).all()
    duplicate_count = int(sum(int(row.case_count) for row in duplicate_rows))

    complete_count = max(total_count - missing_count - invalid_count - duplicate_count, 0)
    metrics = [
        {"status": "完整有效", "count": complete_count},
        {"status": "缺失编号", "count": missing_count},
        {"status": "格式异常", "count": invalid_count},
        {"status": "重复编号", "count": duplicate_count},
    ]
    return [
        {
            **item,
            "rate": round(item["count"] / total_count, 4),
            "key": item["status"],
        }
        for item in metrics
    ]


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
