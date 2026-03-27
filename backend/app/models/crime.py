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
