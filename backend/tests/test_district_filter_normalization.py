import os
import sys
import unittest
from pathlib import Path

from sqlalchemy import Column, Integer, String, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

os.environ["MYSQL_USER"] = "test_user"
os.environ["MYSQL_PASSWORD"] = "test_password"
os.environ["MYSQL_HOST"] = "127.0.0.1"
os.environ["MYSQL_PORT"] = "3306"
os.environ["MYSQL_DATABASE"] = "test_chicago_crime"

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.analytics import apply_filters


Base = declarative_base()


class FakeCrime(Base):
    __tablename__ = "fake_crimes"

    id = Column(Integer, primary_key=True)
    year = Column(Integer)
    primary_type = Column(String(100))
    district = Column(String(10))
    beat = Column(String(10))
    block = Column(String(100))


class DistrictFilterNormalizationTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        self.session = sessionmaker(bind=engine)()
        self.session.add_all(
            [
                FakeCrime(year=2023, primary_type="THEFT", district="007", beat="0711", block="001XX W TEST ST"),
                FakeCrime(year=2023, primary_type="THEFT", district="021", beat="2111", block="002XX W TEST ST"),
            ]
        )
        self.session.commit()

    def tearDown(self):
        self.session.close()

    def test_apply_filters_matches_zero_padded_district_values(self):
        query = self.session.query(FakeCrime)

        rows = apply_filters(query, FakeCrime, district=[7]).all()

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].district, "007")

    def test_apply_filters_matches_zero_padded_beat_values(self):
        query = self.session.query(FakeCrime)

        rows = apply_filters(query, FakeCrime, beat=["711"]).all()

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].beat, "0711")


if __name__ == "__main__":
    unittest.main()
