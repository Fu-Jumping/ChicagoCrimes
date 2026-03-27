from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List


class ResponseModel(BaseModel):
    code: str = "OK"
    message: str = "success"
    data: Any
    meta: Dict[str, Any] = Field(default_factory=dict)
    request_id: str


class ErrorDetailModel(BaseModel):
    field: str
    reason: str


class ErrorResponseModel(BaseModel):
    code: str
    message: str
    error_type: str
    details: List[ErrorDetailModel] = Field(default_factory=list)
    request_id: str
    meta: Dict[str, Any] = Field(default_factory=dict)


class TrendYearlyItem(BaseModel):
    year: int
    count: int

class TrendWeeklyItem(BaseModel):
    day_of_week: int # 0=Monday, 6=Sunday
    count: int

class TrendHourlyItem(BaseModel):
    hour: int
    count: int

class CrimeTypeProportionItem(BaseModel):
    primary_type: str
    count: int

class DistrictComparisonItem(BaseModel):
    district: str
    count: int

class ArrestRateItem(BaseModel):
    arrest: bool
    count: int

class DomesticProportionItem(BaseModel):
    domestic: bool
    count: int

class LocationTypeTopItem(BaseModel):
    location_description: str
    count: int

class TrendMonthlyItem(BaseModel):
    month: int
    count: int

class TypeArrestRateItem(BaseModel):
    primary_type: str
    arrested_count: int
    not_arrested_count: int
    total_count: int
    arrest_rate: float
