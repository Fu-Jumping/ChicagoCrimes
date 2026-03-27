import os
import time
import unittest

from fastapi.testclient import TestClient

os.environ["MYSQL_USER"] = "test_user"
os.environ["MYSQL_PASSWORD"] = "test_password"
os.environ["MYSQL_HOST"] = "127.0.0.1"
os.environ["MYSQL_PORT"] = "3306"
os.environ["MYSQL_DATABASE"] = "test_chicago_crime"

import main
from app.database import get_db
from app.routers import analytics as analytics_router


def reset_response_cache() -> None:
    with main.response_cache._lock:
        main.response_cache._items.clear()
        main.response_cache._hits = 0
        main.response_cache._misses = 0


class Task4ValidationTests(unittest.TestCase):
    def setUp(self):
        self.original_get_monthly_trend = analytics_router.analytics_service.get_monthly_trend
        self.original_get_districts_comparison = analytics_router.analytics_service.get_districts_comparison
        self.original_get_types_proportion = analytics_router.analytics_service.get_types_proportion
        self.original_get_types_arrest_rate = analytics_router.analytics_service.get_types_arrest_rate
        self.original_get_yearly_trend = analytics_router.analytics_service.get_yearly_trend
        reset_response_cache()

        def fake_get_db():
            yield None

        main.app.dependency_overrides[get_db] = fake_get_db

    def tearDown(self):
        analytics_router.analytics_service.get_monthly_trend = self.original_get_monthly_trend
        analytics_router.analytics_service.get_districts_comparison = self.original_get_districts_comparison
        analytics_router.analytics_service.get_types_proportion = self.original_get_types_proportion
        analytics_router.analytics_service.get_types_arrest_rate = self.original_get_types_arrest_rate
        analytics_router.analytics_service.get_yearly_trend = self.original_get_yearly_trend
        main.app.dependency_overrides.clear()
        reset_response_cache()

    def test_chart_regression_line_bar_pie_contract(self):
        analytics_router.analytics_service.get_monthly_trend = lambda _db, _year, **_filters: [
            {"month": 1, "count": 12, "key": "1"},
            {"month": 2, "count": 18, "key": "2"},
        ]
        analytics_router.analytics_service.get_districts_comparison = (
            lambda _db, _year, _limit, _sort, _start=None, _end=None, **_filters: [
                {"district": "001", "count": 20, "key": "001"},
                {"district": "002", "count": 10, "key": "002"},
            ]
        )
        analytics_router.analytics_service.get_types_proportion = (
            lambda _db, _year, _limit, _sort, _start=None, _end=None, **_filters: [
            {"primary_type": "THEFT", "count": 30, "key": "THEFT"},
            {"primary_type": "BATTERY", "count": 15, "key": "BATTERY"},
            ]
        )

        client = TestClient(main.app)

        monthly_resp = client.get("/api/v1/analytics/trend/monthly", params={"year": 2024})
        self.assertEqual(monthly_resp.status_code, 200)
        monthly_payload = monthly_resp.json()
        self.assertEqual(monthly_payload["meta"]["dimension"], ["month"])
        self.assertEqual(monthly_payload["meta"]["metrics"], ["count"])
        self.assertIn("key", monthly_payload["data"][0])
        self.assertIn("month", monthly_payload["data"][0])
        self.assertIn("count", monthly_payload["data"][0])

        district_resp = client.get("/api/v1/analytics/districts/comparison", params={"year": 2024, "limit": 2})
        self.assertEqual(district_resp.status_code, 200)
        district_payload = district_resp.json()
        self.assertEqual(district_payload["meta"]["dimension"], ["district"])
        self.assertEqual(district_payload["meta"]["metrics"], ["count"])
        self.assertIn("district", district_payload["data"][0])
        self.assertIn("count", district_payload["data"][0])
        self.assertIn("key", district_payload["data"][0])

        pie_resp = client.get("/api/v1/analytics/types/proportion", params={"year": 2024, "limit": 2})
        self.assertEqual(pie_resp.status_code, 200)
        pie_payload = pie_resp.json()
        self.assertEqual(pie_payload["meta"]["dimension"], ["primary_type"])
        self.assertEqual(pie_payload["meta"]["metrics"], ["count"])
        self.assertIn("primary_type", pie_payload["data"][0])
        self.assertIn("count", pie_payload["data"][0])
        self.assertIn("key", pie_payload["data"][0])
        self.assertEqual(pie_payload["meta"]["data_quality"]["status"], "pass")
        self.assertEqual(pie_payload["meta"]["alerts"], [])

    def test_types_arrest_rate_contract_uses_ratio_unit(self):
        analytics_router.analytics_service.get_types_arrest_rate = (
            lambda _db, _year, _limit, _sort, _start=None, _end=None, **_filters: [
                {
                    "primary_type": "THEFT",
                    "arrested_count": 2,
                    "not_arrested_count": 8,
                    "total_count": 10,
                    "arrest_rate": 0.2,
                    "key": "THEFT",
                }
            ]
        )

        client = TestClient(main.app)
        response = client.get("/api/v1/analytics/types/arrest_rate", params={"year": 2024, "limit": 1})
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        metric_defs = payload["meta"]["metric_definitions"]
        arrest_rate_def = next(item for item in metric_defs if item["field"] == "arrest_rate")
        self.assertEqual(arrest_rate_def["unit"], "ratio")
        self.assertLessEqual(payload["data"][0]["arrest_rate"], 1)
        self.assertEqual(payload["meta"]["data_quality"]["status"], "pass")

    def test_data_quality_alerts_for_null_and_anomaly_scope(self):
        analytics_router.analytics_service.get_types_arrest_rate = (
            lambda _db, _year, _limit, _sort, _start=None, _end=None, **_filters: [
                {
                    "primary_type": "",
                    "arrested_count": 5,
                    "not_arrested_count": 2,
                    "total_count": 10,
                    "arrest_rate": 1.2,
                    "key": "",
                }
            ]
        )
        client = TestClient(main.app)
        response = client.get("/api/v1/analytics/types/arrest_rate", params={"year": 2024, "limit": 1})
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["meta"]["data_quality"]["status"], "warn")
        self.assertGreaterEqual(payload["meta"]["data_quality"]["null_issue_count"], 1)
        self.assertGreaterEqual(payload["meta"]["data_quality"]["anomaly_issue_count"], 2)
        alert_codes = [item["code"] for item in payload["meta"]["alerts"]]
        self.assertIn("DQ_NULL_VALUE", alert_codes)
        self.assertIn("DQ_ANOMALY_METRIC_SCOPE", alert_codes)

    def test_performance_cache_hit_and_etag(self):
        call_count = {"value": 0}

        def fake_get_yearly_trend(**_kwargs):
            call_count["value"] += 1
            time.sleep(0.08)
            return [{"year": 2023, "count": 100, "key": "2023"}]

        analytics_router.analytics_service.get_yearly_trend = fake_get_yearly_trend
        client = TestClient(main.app)

        started = time.perf_counter()
        first = client.get("/api/v1/analytics/trend/yearly", params={"start_year": 2023, "end_year": 2023})
        first_elapsed_ms = (time.perf_counter() - started) * 1000
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.headers.get("X-Cache"), "MISS")
        self.assertEqual(call_count["value"], 1)

        started = time.perf_counter()
        second = client.get("/api/v1/analytics/trend/yearly", params={"start_year": 2023, "end_year": 2023})
        second_elapsed_ms = (time.perf_counter() - started) * 1000
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.headers.get("X-Cache"), "HIT")
        self.assertEqual(call_count["value"], 1)
        self.assertLess(second_elapsed_ms, first_elapsed_ms)
        self.assertLess(second_elapsed_ms, 80)

        etag = first.headers.get("ETag")
        third = client.get(
            "/api/v1/analytics/trend/yearly",
            params={"start_year": 2023, "end_year": 2023},
            headers={"If-None-Match": etag},
        )
        self.assertEqual(third.status_code, 304)
        self.assertEqual(third.headers.get("X-Cache"), "HIT")


if __name__ == "__main__":
    unittest.main()
