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

    def distinct(self):
        return self

    def all(self):
        return self.rows


class FakeSession:
    def __init__(self, response_sets):
        self.response_sets = list(response_sets)
        self.query_columns_history = []

    def query(self, *columns):
        self.query_columns_history.append(columns)
        index = len(self.query_columns_history) - 1
        rows = self.response_sets[index] if index < len(self.response_sets) else []
        return FakeQuery(rows)


class LayeredSummaryCapabilitiesTests(unittest.TestCase):
    def setUp(self):
        self.original_loader = getattr(analytics_service, "_load_summary_table_columns", None)
        self.original_capabilities = getattr(analytics_service, "_summary_capabilities", None)
        analytics_service._summary_capabilities = None

    def tearDown(self):
        if self.original_loader is not None:
            analytics_service._load_summary_table_columns = self.original_loader
        analytics_service._summary_capabilities = None
        if self.original_capabilities is not None:
            analytics_service._summary_capabilities = self.original_capabilities

    def test_detects_each_summary_table_from_physical_schema(self):
        analytics_service._load_summary_table_columns = lambda: {
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

        capabilities = analytics_service.get_summary_capabilities(force_refresh=True)

        self.assertTrue(capabilities.base_summary)
        self.assertTrue(capabilities.filter_summary)
        self.assertTrue(capabilities.location_summary)
        self.assertTrue(capabilities.daily_summary)

    def test_yearly_trend_uses_filter_summary_for_extended_filters(self):
        analytics_service._summary_capabilities = analytics_service.SummaryCapabilities(
            base_summary=True,
            filter_summary=True,
            location_summary=False,
            daily_summary=False,
        )
        db = FakeSession([[SimpleNamespace(year=2023, count=11)]])

        result = analytics_service.get_yearly_trend(
            db,
            start_year=2023,
            end_year=2023,
            ward=22,
            domestic=True,
        )

        self.assertEqual(result, [{"year": 2023, "count": 11, "key": "2023"}])
        self.assertTrue(str(db.query_columns_history[0][0]).startswith("CrimeFilterSummary."))

    def test_filter_options_use_filter_summary_distinct_paths_when_available(self):
        analytics_service._summary_capabilities = analytics_service.SummaryCapabilities(
            base_summary=True,
            filter_summary=True,
            location_summary=False,
            daily_summary=False,
        )
        db = FakeSession(
            [
                [("0711",), ("0712",), ("",), (None,)],
                [(22,), (23,)],
                [(25,), (26,)],
            ]
        )

        result = analytics_service.get_filter_options(
            db,
            year=2023,
            month=2,
            ward=22,
            domestic=True,
        )

        self.assertEqual(result["beats"], ["0711", "0712"])
        self.assertEqual(result["wards"], [22, 23])
        self.assertEqual(result["community_areas"], [25, 26])
        self.assertTrue(str(db.query_columns_history[0][0]).startswith("CrimeFilterSummary."))
        self.assertTrue(str(db.query_columns_history[1][0]).startswith("CrimeFilterSummary."))
        self.assertTrue(str(db.query_columns_history[2][0]).startswith("CrimeFilterSummary."))

    def test_location_types_use_location_summary_only_when_available(self):
        analytics_service._summary_capabilities = analytics_service.SummaryCapabilities(
            base_summary=True,
            filter_summary=True,
            location_summary=True,
            daily_summary=False,
        )
        db = FakeSession([[SimpleNamespace(location_description="STREET", count=9)]])

        result = analytics_service.get_location_types_top(db, year=2023, limit=5)

        self.assertEqual(result[0]["location_description"], "STREET")
        self.assertTrue(str(db.query_columns_history[0][0]).startswith("CrimeLocationSummary."))

    def test_location_types_fall_back_to_raw_when_location_summary_missing(self):
        analytics_service._summary_capabilities = analytics_service.SummaryCapabilities(
            base_summary=True,
            filter_summary=True,
            location_summary=False,
            daily_summary=False,
        )
        db = FakeSession([[SimpleNamespace(location_description="STREET", count=9)]])

        result = analytics_service.get_location_types_top(db, year=2023, limit=5)

        self.assertEqual(result[0]["location_description"], "STREET")
        self.assertTrue(str(db.query_columns_history[0][0]).startswith("Crime.location_description"))

    def test_weekly_and_hourly_trends_do_not_assume_legacy_summary_columns(self):
        analytics_service._summary_capabilities = analytics_service.SummaryCapabilities(
            base_summary=True,
            filter_summary=True,
            location_summary=True,
            daily_summary=False,
        )

        weekly_db = FakeSession([[SimpleNamespace(day_of_week_mysql=2, count=5)]])
        weekly = analytics_service.get_weekly_trend(weekly_db, year=2023)
        self.assertEqual(weekly[0]["day_of_week"], 0)
        self.assertIn("crime_dow", str(weekly_db.query_columns_history[0][0]))

        hourly_db = FakeSession([[SimpleNamespace(hour=13, count=7)]])
        hourly = analytics_service.get_hourly_trend(hourly_db, year=2023)
        self.assertEqual(hourly[13]["count"], 7)
        self.assertIn("crime_hour", str(hourly_db.query_columns_history[0][0]))

    def test_yearly_trend_uses_daily_summary_for_custom_date_range(self):
        analytics_service._summary_capabilities = analytics_service.SummaryCapabilities(
            base_summary=True,
            filter_summary=True,
            location_summary=False,
            daily_summary=True,
        )
        db = FakeSession([[SimpleNamespace(crime_year=2023, count=19)]])

        result = analytics_service.get_yearly_trend(
            db,
            start_date=analytics_service.datetime(2023, 3, 1),
            end_date=analytics_service.datetime(2023, 8, 31, 23, 59, 59),
        )

        self.assertEqual(result, [{"year": 2023, "count": 19, "key": "2023"}])
        self.assertTrue(str(db.query_columns_history[0][0]).startswith("CrimeDailySummary."))

    def test_types_proportion_uses_daily_summary_for_custom_date_range(self):
        analytics_service._summary_capabilities = analytics_service.SummaryCapabilities(
            base_summary=True,
            filter_summary=True,
            location_summary=False,
            daily_summary=True,
        )
        db = FakeSession([[SimpleNamespace(primary_type="THEFT", count=23)]])

        result = analytics_service.get_types_proportion(
            db,
            start_date=analytics_service.datetime(2023, 3, 1),
            end_date=analytics_service.datetime(2023, 8, 31, 23, 59, 59),
            limit=5,
        )

        self.assertEqual(result, [{"primary_type": "THEFT", "count": 23, "key": "THEFT"}])
        self.assertTrue(str(db.query_columns_history[0][0]).startswith("CrimeDailySummary."))


if __name__ == "__main__":
    unittest.main()
