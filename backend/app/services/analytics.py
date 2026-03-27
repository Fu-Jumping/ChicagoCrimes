from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc
from typing import Optional, List, Dict, Any
from datetime import datetime

from app.models.crime import Crime


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

def apply_filters(
    query,
    model,
    start_year: Optional[int] = None,
    end_year: Optional[int] = None,
    year: Optional[int] = None,
    primary_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
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
    return query

def get_yearly_trend(
    db: Session,
    start_year: Optional[int] = None,
    end_year: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    primary_type: Optional[str] = None,
    sort: str = "asc",
) -> List[Dict[str, Any]]:
    sort_expr = asc(Crime.year) if sort == "asc" else desc(Crime.year)
    query = db.query(
        Crime.year,
        func.count(Crime.id).label('count')
    ).group_by(Crime.year).order_by(sort_expr)
    
    query = apply_filters(query, Crime, start_year, end_year, None, primary_type, start_date, end_date)
    
    results = query.all()
    data = [{"year": r.year, "count": r.count} for r in results if r.year is not None]
    return add_stable_key(data, "year")

def get_weekly_trend(
    db: Session,
    year: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    query = db.query(
        func.dayofweek(Crime.date).label('day_of_week_mysql'),
        func.count(Crime.id).label('count')
    ).group_by('day_of_week_mysql')
    
    query = apply_filters(query, Crime, None, None, year, None, start_date, end_date)
    
    results = query.all()
    formatted_results = []
    for r in results:
        if r.day_of_week_mysql is not None:
            day = r.day_of_week_mysql - 2
            if day < 0:
                day = 6
            formatted_results.append({"day_of_week": day, "count": r.count})

    fixed_buckets = fill_fixed_buckets(formatted_results, "day_of_week", 0, 6)
    return add_stable_key(fixed_buckets, "day_of_week")

def get_hourly_trend(
    db: Session,
    year: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    query = db.query(
        func.hour(Crime.date).label('hour'),
        func.count(Crime.id).label('count')
    ).group_by('hour').order_by(asc('hour'))
    
    query = apply_filters(query, Crime, None, None, year, None, start_date, end_date)
    
    results = query.all()
    data = [{"hour": r.hour, "count": r.count} for r in results if r.hour is not None]
    fixed_buckets = fill_fixed_buckets(data, "hour", 0, 23)
    return add_stable_key(fixed_buckets, "hour")

def get_types_proportion(
    db: Session,
    year: Optional[int] = None,
    limit: int = 10,
    sort: str = "desc",
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    sort_expr = desc('count') if sort == "desc" else asc('count')
    query = db.query(
        Crime.primary_type,
        func.count(Crime.id).label('count')
    ).group_by(Crime.primary_type)
    query = apply_filters(query, Crime, None, None, year, None, start_date, end_date)
    query = query.order_by(sort_expr, asc(Crime.primary_type)).limit(limit)
    
    results = query.all()
    data = [{"primary_type": r.primary_type, "count": r.count} for r in results if r.primary_type is not None]
    return add_stable_key(data, "primary_type")

def get_districts_comparison(
    db: Session,
    year: Optional[int] = None,
    limit: int = 20,
    sort: str = "desc",
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    sort_expr = desc('count') if sort == "desc" else asc('count')
    query = db.query(
        Crime.district,
        func.count(Crime.id).label('count')
    ).group_by(Crime.district)
    query = apply_filters(query, Crime, None, None, year, None, start_date, end_date)
    query = query.order_by(sort_expr, asc(Crime.district)).limit(limit)
    
    results = query.all()
    data = [{"district": r.district, "count": r.count} for r in results if r.district is not None and r.district.strip() != ""]
    return add_stable_key(data, "district")

def get_arrests_rate(
    db: Session,
    year: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    query = db.query(
        Crime.arrest,
        func.count(Crime.id).label('count')
    ).group_by(Crime.arrest)
    
    query = apply_filters(query, Crime, None, None, year, None, start_date, end_date)
    
    results = query.all()
    data = [{"arrest": bool(r.arrest), "count": r.count} for r in results if r.arrest is not None]
    return add_stable_key(data, "arrest")

def get_domestic_proportion(
    db: Session,
    year: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    query = db.query(
        Crime.domestic,
        func.count(Crime.id).label('count')
    ).group_by(Crime.domestic)
    
    query = apply_filters(query, Crime, None, None, year, None, start_date, end_date)
    
    results = query.all()
    data = [{"domestic": bool(r.domestic), "count": r.count} for r in results if r.domestic is not None]
    return add_stable_key(data, "domestic")

def get_location_types_top(
    db: Session,
    year: Optional[int] = None,
    limit: int = 10,
    sort: str = "desc",
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    sort_expr = desc('count') if sort == "desc" else asc('count')
    query = db.query(
        Crime.location_description,
        func.count(Crime.id).label('count')
    ).group_by(Crime.location_description)
    query = apply_filters(query, Crime, None, None, year, None, start_date, end_date)
    query = query.order_by(sort_expr, asc(Crime.location_description)).limit(limit)
    
    results = query.all()
    data = [{"location_description": r.location_description, "count": r.count} for r in results if r.location_description is not None]
    return add_stable_key(data, "location_description")

def get_monthly_trend(db: Session, year: int) -> List[Dict[str, Any]]:
    query = db.query(
        func.month(Crime.date).label('month'),
        func.count(Crime.id).label('count')
    ).filter(Crime.year == year).group_by('month').order_by(asc('month'))
    
    results = query.all()
    data = [{"month": r.month, "count": r.count} for r in results if r.month is not None]
    fixed_buckets = fill_fixed_buckets(data, "month", 1, 12)
    return add_stable_key(fixed_buckets, "month")

def get_types_arrest_rate(
    db: Session,
    year: Optional[int] = None,
    limit: int = 10,
    sort: str = "desc",
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    sort_expr = desc('count') if sort == "desc" else asc('count')
    top_types_query = db.query(
        Crime.primary_type,
        func.count(Crime.id).label('count')
    ).group_by(Crime.primary_type)
    top_types_query = apply_filters(top_types_query, Crime, None, None, year, None, start_date, end_date)
    top_types_query = top_types_query.order_by(sort_expr, asc(Crime.primary_type)).limit(limit)
    top_types = [r.primary_type for r in top_types_query.all() if r.primary_type is not None]
    
    if not top_types:
        return []
    
    query = db.query(
        Crime.primary_type,
        Crime.arrest,
        func.count(Crime.id).label('count')
    ).filter(Crime.primary_type.in_(top_types)).group_by(Crime.primary_type, Crime.arrest)
    
    query = apply_filters(query, Crime, None, None, year, None, start_date, end_date)
    results = query.all()
  
    type_stats = {pt: {"arrested": 0, "not_arrested": 0, "total": 0} for pt in top_types}
    for r in results:
        if r.primary_type in type_stats:
            if r.arrest:
                type_stats[r.primary_type]["arrested"] = r.count
            else:
                type_stats[r.primary_type]["not_arrested"] = r.count
            type_stats[r.primary_type]["total"] += r.count
            
    final_results = []
    for pt, stats in type_stats.items():
        if stats["total"] > 0:
            final_results.append({
                "primary_type": pt,
                "arrested_count": stats["arrested"],
                "not_arrested_count": stats["not_arrested"],
                "total_count": stats["total"],
                "arrest_rate": round(stats["arrested"] / stats["total"], 4) if stats["total"] > 0 else 0
            })

    sorted_results = sorted(
        final_results,
        key=lambda x: (x["total_count"], x["primary_type"]),
        reverse=(sort == "desc"),
    )
    return add_stable_key(sorted_results, "primary_type")

def get_geo_heatmap(db: Session, year: Optional[int] = None, month: Optional[int] = None):
    # Group by rounded coordinates for heatmap
    # For simplicity, round to 3 decimal places (~110m resolution)
    lat_expr = func.round(Crime.latitude, 3).label("lat")
    lng_expr = func.round(Crime.longitude, 3).label("lng")
    
    query = db.query(
        lat_expr,
        lng_expr,
        func.count(Crime.id).label("count")
    ).filter(
        Crime.latitude.isnot(None),
        Crime.longitude.isnot(None)
    )
    
    if year is not None:
        query = query.filter(Crime.year == year)
    if month is not None:
        # SQLite extract month, but we are using MySQL, so we should use func.month
        query = query.filter(func.month(Crime.date) == month)
        
    query = query.group_by(
        func.round(Crime.latitude, 3),
        func.round(Crime.longitude, 3)
    )
    
    results = query.all()
    return [{"lat": r.lat, "lng": r.lng, "count": r.count} for r in results]
