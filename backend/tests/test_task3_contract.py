import os
import unittest

from fastapi.testclient import TestClient
from starlette.requests import Request

os.environ["MYSQL_USER"] = "test_user"
os.environ["MYSQL_PASSWORD"] = "test_password"
os.environ["MYSQL_HOST"] = "127.0.0.1"
os.environ["MYSQL_PORT"] = "3306"
os.environ["MYSQL_DATABASE"] = "test_chicago_crime"

import main
from app.database import get_db
from app.routers import analytics as analytics_router
from app.routers.analytics import build_meta
from app.services.analytics import add_stable_key, fill_fixed_buckets


class Task3ContractTests(unittest.TestCase):
    def test_fill_fixed_buckets_hourly(self):
        buckets = fill_fixed_buckets(
            [{"hour": 0, "count": 3}, {"hour": 2, "count": 7}],
            "hour",
            0,
            3,
        )
        self.assertEqual(
            buckets,
            [
                {"hour": 0, "count": 3},
                {"hour": 1, "count": 0},
                {"hour": 2, "count": 7},
                {"hour": 3, "count": 0},
            ],
        )

    def test_add_stable_key(self):
        data = add_stable_key([{"primary_type": "THEFT", "count": 10}], "primary_type")
        self.assertEqual(data[0]["key"], "THEFT")

    def test_build_meta_contains_metric_and_state_contract(self):
        meta = build_meta(
            filters={"year": 2024},
            dimensions=["month"],
            metrics=["count"],
            data=[],
        )
        self.assertIn("dimension_definitions", meta)
        self.assertIn("metric_definitions", meta)
        self.assertIn("state_contract", meta)
        self.assertTrue(meta["state_contract"]["empty"]["is_empty"])

    def test_error_payload_contains_state_contract(self):
        request = Request({"type": "http", "headers": []})
        payload = main.build_error_payload(
            request=request,
            code="SYSTEM_ERROR",
            message="系统错误",
            error_type="system_error",
            details=[],
        )
        self.assertTrue(payload.meta["state_contract"]["error"]["is_error"])
        self.assertIn("loading", payload.meta["state_contract"])

    def test_monthly_api_meta_contract(self):
        original_get_monthly_trend = analytics_router.analytics_service.get_monthly_trend

        def fake_get_db():
            yield None

        def fake_get_monthly_trend(_db, _year, **_filters):
            return [{"month": 1, "count": 5, "key": "1"}]

        main.app.dependency_overrides[get_db] = fake_get_db
        analytics_router.analytics_service.get_monthly_trend = fake_get_monthly_trend
        try:
            client = TestClient(main.app)
            response = client.get("/api/v1/analytics/trend/monthly", params={"year": 2024})
            self.assertEqual(response.status_code, 200)
            payload = response.json()
            self.assertIn("state_contract", payload["meta"])
            self.assertFalse(payload["meta"]["state_contract"]["empty"]["is_empty"])
            self.assertEqual(payload["meta"]["dimension"], ["month"])
            self.assertEqual(payload["meta"]["metrics"], ["count"])
        finally:
            analytics_router.analytics_service.get_monthly_trend = original_get_monthly_trend
            main.app.dependency_overrides.clear()


if __name__ == "__main__":
    unittest.main()
