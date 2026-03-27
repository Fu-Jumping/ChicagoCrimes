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


class Task56SpecialValidationTests(unittest.TestCase):
    def setUp(self):
        self.original_get_districts_comparison = analytics_router.analytics_service.get_districts_comparison
        self.original_get_yearly_trend = analytics_router.analytics_service.get_yearly_trend
        reset_response_cache()

        def fake_get_db():
            yield None

        main.app.dependency_overrides[get_db] = fake_get_db

    def tearDown(self):
        analytics_router.analytics_service.get_districts_comparison = self.original_get_districts_comparison
        analytics_router.analytics_service.get_yearly_trend = self.original_get_yearly_trend
        main.app.dependency_overrides.clear()
        reset_response_cache()

    def test_large_dataset_response_and_cache_hit(self):
        data_size = 5000
        call_count = {"value": 0}

        def fake_get_districts_comparison(_db, _year, _limit, _sort, _start=None, _end=None, **_filters):
            call_count["value"] += 1
            time.sleep(0.05)
            return [
                {
                    "district": f"{index + 1:03d}",
                    "count": data_size - index,
                    "key": f"{index + 1:03d}",
                }
                for index in range(data_size)
            ]

        analytics_router.analytics_service.get_districts_comparison = fake_get_districts_comparison
        client = TestClient(main.app)

        first = client.get("/api/v1/analytics/districts/comparison", params={"year": 2024, "limit": 100})
        self.assertEqual(first.status_code, 200)
        first_payload = first.json()
        self.assertEqual(first.headers.get("X-Cache"), "MISS")
        self.assertEqual(len(first_payload["data"]), data_size)
        self.assertEqual(first_payload["meta"]["state_contract"]["empty"]["size"], data_size)
        self.assertEqual(first_payload["meta"]["data_quality"]["checked_rows"], data_size)
        self.assertEqual(first_payload["meta"]["data_quality"]["status"], "pass")
        self.assertEqual(call_count["value"], 1)

        second = client.get("/api/v1/analytics/districts/comparison", params={"year": 2024, "limit": 100})
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.headers.get("X-Cache"), "HIT")
        self.assertEqual(call_count["value"], 1)

    def test_cache_invalidation_after_expiration(self):
        call_count = {"value": 0}

        def fake_get_yearly_trend(**_kwargs):
            call_count["value"] += 1
            return [
                {
                    "year": 2024,
                    "count": 100 * call_count["value"],
                    "key": "2024",
                }
            ]

        analytics_router.analytics_service.get_yearly_trend = fake_get_yearly_trend
        client = TestClient(main.app)

        first = client.get("/api/v1/analytics/trend/yearly", params={"start_year": 2024, "end_year": 2024})
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.headers.get("X-Cache"), "MISS")
        self.assertEqual(call_count["value"], 1)
        first_payload = first.json()

        second = client.get("/api/v1/analytics/trend/yearly", params={"start_year": 2024, "end_year": 2024})
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.headers.get("X-Cache"), "HIT")
        self.assertEqual(call_count["value"], 1)

        with main.response_cache._lock:
            for key in list(main.response_cache._items.keys()):
                main.response_cache._items[key].expires_at = 0

        third = client.get("/api/v1/analytics/trend/yearly", params={"start_year": 2024, "end_year": 2024})
        self.assertEqual(third.status_code, 200)
        self.assertEqual(third.headers.get("X-Cache"), "MISS")
        self.assertEqual(call_count["value"], 2)
        third_payload = third.json()
        self.assertNotEqual(third_payload["data"][0]["count"], first_payload["data"][0]["count"])


if __name__ == "__main__":
    unittest.main()
