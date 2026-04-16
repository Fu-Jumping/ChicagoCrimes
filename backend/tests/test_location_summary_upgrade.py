import os
import unittest
from unittest.mock import patch

os.environ["MYSQL_USER"] = "test_user"
os.environ["MYSQL_PASSWORD"] = "test_password"
os.environ["MYSQL_HOST"] = "127.0.0.1"
os.environ["MYSQL_PORT"] = "3306"
os.environ["MYSQL_DATABASE"] = "test_chicago_crime"

from app.services import setup_service


class FakeInspector:
    def __init__(self, existing_tables):
        self.existing_tables = set(existing_tables)

    def has_table(self, table_name):
        return table_name in self.existing_tables


class LocationSummaryUpgradeTests(unittest.TestCase):
    def setUp(self):
        self.original_engine = setup_service._db.engine

    def tearDown(self):
        setup_service._db.engine = self.original_engine

    def test_optional_location_fast_summary_bootstrap_is_noop_without_database(self):
        setup_service._db.engine = None

        result = setup_service.ensure_optional_location_fast_summaries()

        self.assertEqual(result, {"built": [], "skipped": "database_not_configured"})

    @patch("app.services.setup_service.reset_summary_capabilities_cache")
    @patch("app.services.setup_service._build_location_daily_summary", create=True)
    @patch("app.services.setup_service._build_location_period_summary", create=True)
    @patch("app.services.setup_service._build_location_rollup_summary", create=True)
    @patch("app.services.setup_service.inspect")
    def test_optional_location_fast_summary_bootstrap_builds_only_missing_tables(
        self,
        mock_inspect,
        mock_rollup,
        mock_period,
        mock_daily,
        mock_reset_cache,
    ):
        setup_service._db.engine = object()
        mock_inspect.return_value = FakeInspector(
            {
                "crimes",
                "crimes_summary",
                "crimes_filter_summary",
                "crimes_location_summary",
                "crimes_daily_summary",
                "crimes_location_rollup_summary",
            }
        )

        result = setup_service.ensure_optional_location_fast_summaries()

        mock_rollup.assert_not_called()
        mock_period.assert_called_once_with()
        mock_daily.assert_called_once_with()
        mock_reset_cache.assert_called_once_with()
        self.assertEqual(
            result,
            {
                "built": [
                    "crimes_location_period_summary",
                    "crimes_location_daily_summary",
                ],
                "skipped": None,
            },
        )

    @patch("app.services.setup_service.inspect")
    def test_optional_location_fast_summary_bootstrap_skips_when_core_summaries_are_missing(self, mock_inspect):
        setup_service._db.engine = object()
        mock_inspect.return_value = FakeInspector({"crimes", "crimes_summary"})

        result = setup_service.ensure_optional_location_fast_summaries()

        self.assertEqual(result, {"built": [], "skipped": "core_summaries_missing"})


if __name__ == "__main__":
    unittest.main()
