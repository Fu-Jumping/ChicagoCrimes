import os
import unittest
from types import SimpleNamespace

os.environ["MYSQL_USER"] = "test_user"
os.environ["MYSQL_PASSWORD"] = "test_password"
os.environ["MYSQL_HOST"] = "127.0.0.1"
os.environ["MYSQL_PORT"] = "3306"
os.environ["MYSQL_DATABASE"] = "test_chicago_crime"

from app.services import analytics as analytics_service


class FakeQuery:
    def __init__(self, rows):
        self.rows = rows

    def filter(self, *_args, **_kwargs):
        return self

    def group_by(self, *_args, **_kwargs):
        return self

    def order_by(self, *_args, **_kwargs):
        return self

    def limit(self, *_args, **_kwargs):
        return self

    def all(self):
        return self.rows


class FakeSession:
    def __init__(self, rows):
        self.rows = rows
        self.last_columns = None

    def query(self, *columns):
        self.last_columns = columns
        return FakeQuery(self.rows)


class SummaryFastPathTests(unittest.TestCase):
    def setUp(self):
        self.original_capabilities = getattr(analytics_service, "_summary_capabilities", None)
        analytics_service._summary_capabilities = analytics_service.SummaryCapabilities(
            base_summary=True,
            filter_summary=True,
            location_summary=True,
            daily_summary=False,
        )

    def tearDown(self):
        analytics_service._summary_capabilities = self.original_capabilities

    def test_yearly_trend_uses_base_summary_when_extended_filters_are_absent(self):
        db = FakeSession([SimpleNamespace(year=2023, count=5)])

        result = analytics_service.get_yearly_trend(db, start_year=2023, end_year=2023)

        self.assertEqual(result[0]["year"], 2023)
        self.assertTrue(str(db.last_columns[0]).startswith("CrimeSummary."))

    def test_monthly_trend_uses_base_summary_when_extended_filters_are_absent(self):
        db = FakeSession([SimpleNamespace(month=3, count=7)])

        result = analytics_service.get_monthly_trend(db, year=2023)

        self.assertEqual(result[2]["count"], 7)
        self.assertTrue(str(db.last_columns[0]).startswith("CrimeSummary."))


if __name__ == "__main__":
    unittest.main()
