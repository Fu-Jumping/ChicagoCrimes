from sqlalchemy import Column, Integer, SmallInteger, String, Boolean, Float, DateTime, Date, Text
from app.database import Base

class Crime(Base):
    __tablename__ = "crimes"

    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String(50), index=True)
    date = Column(DateTime, index=True)
    block = Column(String(100))
    iucr = Column(String(10))
    primary_type = Column(String(100), index=True)
    description = Column(String(255))
    location_description = Column(String(255))
    arrest = Column(Boolean, index=True)
    domestic = Column(Boolean, index=True)
    beat = Column(String(10))
    district = Column(String(10), index=True)
    ward = Column(Integer)
    community_area = Column(Integer)
    fbi_code = Column(String(10))
    x_coordinate = Column(Float)
    y_coordinate = Column(Float)
    year = Column(Integer, index=True)
    crime_month = Column(SmallInteger)
    crime_dow = Column(SmallInteger)
    crime_hour = Column(SmallInteger)
    updated_on = Column(DateTime)
    latitude = Column(Float)
    longitude = Column(Float)
    lat_round3 = Column(Float)
    lng_round3 = Column(Float)
    location = Column(String(255))


class CrimeSummary(Base):
    __tablename__ = "crimes_summary"

    id = Column(Integer, primary_key=True, autoincrement=True)
    year = Column(SmallInteger, nullable=False, index=True)
    month = Column(SmallInteger, nullable=False)
    primary_type = Column(String(100), nullable=False)
    district = Column(String(10), nullable=False)
    arrest = Column(Boolean, nullable=False)
    domestic = Column(Boolean, nullable=False)
    crime_count = Column(Integer, nullable=False, default=0)


class CrimeFilterSummary(Base):
    __tablename__ = "crimes_filter_summary"

    id = Column(Integer, primary_key=True, autoincrement=True)
    year = Column(SmallInteger, nullable=False, index=True)
    month = Column(SmallInteger, nullable=False)
    primary_type = Column(String(100), nullable=False)
    district = Column(String(10), nullable=False)
    beat = Column(String(10), nullable=True)
    ward = Column(Integer, nullable=True)
    community_area = Column(Integer, nullable=True)
    arrest = Column(Boolean, nullable=False)
    domestic = Column(Boolean, nullable=False)
    crime_count = Column(Integer, nullable=False, default=0)


class CrimeLocationSummary(Base):
    __tablename__ = "crimes_location_summary"

    id = Column(Integer, primary_key=True, autoincrement=True)
    year = Column(SmallInteger, nullable=False, index=True)
    month = Column(SmallInteger, nullable=False)
    primary_type = Column(String(100), nullable=False)
    district = Column(String(10), nullable=False)
    location_description = Column(String(255), nullable=False, default="")
    arrest = Column(Boolean, nullable=False)
    domestic = Column(Boolean, nullable=False)
    crime_count = Column(Integer, nullable=False, default=0)


class CrimeLocationRollupSummary(Base):
    """
    地点聚合统计模型 (Rollup Summary)
    用途: 提供所有年份和月份累加的全局地点案发总量统计，作为最高层级的聚合缓存。
    业务含义: 加速无时间条件筛选下的地点案件数量统计分析（例如“全局案件最高发的十大地点”）。
    """
    __tablename__ = "crimes_location_rollup_summary"

    id = Column(Integer, primary_key=True, autoincrement=True)
    location_description = Column(String(255), nullable=False, default="")
    crime_count = Column(Integer, nullable=False, default=0)


class CrimeLocationPeriodSummary(Base):
    """
    地点周期统计模型 (Period Summary)
    用途: 提供按年月(Year-Month)分组聚合的地点案发数量统计缓存。
    业务含义: 用于加速按年份或月份进行时间条件筛选时的地点案件分布查询，避免对原始海量案件表进行按年月与地点的全量扫描。
    """
    __tablename__ = "crimes_location_period_summary"

    id = Column(Integer, primary_key=True, autoincrement=True)
    year = Column(SmallInteger, nullable=False, index=True)
    month = Column(SmallInteger, nullable=False)
    location_description = Column(String(255), nullable=False, default="")
    crime_count = Column(Integer, nullable=False, default=0)


class CrimeLocationDailySummary(Base):
    """
    地点每日统计模型 (Daily Summary)
    用途: 提供按日(Date)精确分组的地点案发数量统计缓存。
    业务含义: 支持最细粒度的时间范围筛选(例如特定某几天的查询)，是 Period/Rollup 表的基础，能够大幅加速指定日期区间的地点统计分析。
    """
    __tablename__ = "crimes_location_daily_summary"

    id = Column(Integer, primary_key=True, autoincrement=True)
    crime_date = Column(Date, nullable=False, index=True)
    crime_year = Column(SmallInteger, nullable=False, index=True)
    crime_month = Column(SmallInteger, nullable=False)
    location_description = Column(String(255), nullable=False, default="")
    crime_count = Column(Integer, nullable=False, default=0)


class CrimeDailySummary(Base):
    __tablename__ = "crimes_daily_summary"

    id = Column(Integer, primary_key=True, autoincrement=True)
    crime_date = Column(Date, nullable=False, index=True)
    crime_year = Column(SmallInteger, nullable=False, index=True)
    crime_month = Column(SmallInteger, nullable=False)
    primary_type = Column(String(100), nullable=False)
    district = Column(String(10), nullable=False)
    arrest = Column(Boolean, nullable=False)
    domestic = Column(Boolean, nullable=False)
    crime_count = Column(Integer, nullable=False, default=0)
