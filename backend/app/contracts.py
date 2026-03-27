from datetime import date

API_VERSION = "v1"
CONTRACT_VERSION = "2026.03.0"

YEAR_MIN = 2001
YEAR_MAX = 2100
LIMIT_MIN = 1
LIMIT_MAX = 100

SUPPORTED_SORT_VALUES = {"asc", "desc"}


def is_supported_sort(value: str) -> bool:
    return value.lower() in SUPPORTED_SORT_VALUES
def is_valid_date_range(start_date: date | None, end_date: date | None) -> bool:
    if start_date is None and end_date is None:
        return True
    if start_date is None or end_date is None:
        return False
    return start_date <= end_date
