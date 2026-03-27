import os
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
from app.services import analytics as analytics_service


def reset_response_cache() -> None:
    with main.response_cache._lock:
      main.response_cache._items.clear()
      main.response_cache._hits = 0
      main.response_cache._misses = 0


class ExtendedFiltersTests(unittest.TestCase):
    def setUp(self):
        self.original_get_location_types_top = analytics_router.analytics_service.get_location_types_top
        self.original_get_geo_heatmap = analytics_router.analytics_service.get_geo_heatmap
        self.original_get_filter_options = getattr(
            analytics_router.analytics_service, "get_filter_options", None
        )
        reset_response_cache()

        def fake_get_db():
            yield None

        main.app.dependency_overrides[get_db] = fake_get_db

    def tearDown(self):
        analytics_router.analytics_service.get_location_types_top = self.original_get_location_types_top
        analytics_router.analytics_service.get_geo_heatmap = self.original_get_geo_heatmap
        if self.original_get_filter_options is not None:
            analytics_router.analytics_service.get_filter_options = self.original_get_filter_options
        elif hasattr(analytics_router.analytics_service, "get_filter_options"):
            delattr(analytics_router.analytics_service, "get_filter_options")
        main.app.dependency_overrides.clear()
        reset_response_cache()

    def test_can_use_summary_filters_accounts_for_raw_only_dimensions(self):
        self.assertTrue(
            analytics_service.can_use_summary_filters(month=3, domestic=False)
        )
        self.assertFalse(
            analytics_service.can_use_summary_filters(beat="0711")
        )
        self.assertFalse(
            analytics_service.can_use_summary_filters(ward=11)
        )
        self.assertFalse(
            analytics_service.can_use_summary_filters(community_area=25)
        )

    def test_location_types_route_passes_extended_filter_kwargs(self):
        captured: dict[str, object] = {}

        def fake_get_location_types_top(*args, **kwargs):
            captured["args"] = args
            captured["kwargs"] = kwargs
            return [{"location_description": "STREET", "count": 10, "key": "STREET"}]

        analytics_router.analytics_service.get_location_types_top = fake_get_location_types_top
        client = TestClient(main.app)

        response = client.get(
            "/api/v1/analytics/location/types",
            params={
                "year": 2023,
                "primary_type": "THEFT",
                "month": 2,
                "beat": "0711",
                "ward": 11,
                "community_area": 25,
                "district": 7,
                "arrest": "true",
                "domestic": "false",
                "limit": 5,
            },
        )

        self.assertEqual(response.status_code, 200)
        kwargs = captured["kwargs"]
        self.assertEqual(kwargs["month"], 2)
        self.assertEqual(kwargs["beat"], "0711")
        self.assertEqual(kwargs["ward"], 11)
        self.assertEqual(kwargs["community_area"], 25)
        self.assertEqual(kwargs["district"], 7)
        self.assertTrue(kwargs["arrest"])
        self.assertFalse(kwargs["domestic"])

    def test_geo_heatmap_route_passes_shared_extended_filters(self):
        captured: dict[str, object] = {}

        def fake_get_geo_heatmap(*args, **kwargs):
            captured["args"] = args
            captured["kwargs"] = kwargs
            return [{"lat": 41.9, "lng": -87.6, "count": 5}]

        analytics_router.analytics_service.get_geo_heatmap = fake_get_geo_heatmap
        client = TestClient(main.app)

        response = client.get(
            "/api/v1/analytics/geo/heatmap",
            params={
                "year": 2023,
                "month": 4,
                "beat": "111",
                "ward": 22,
                "community_area": 33,
                "district": 9,
                "arrest": "false",
                "domestic": "true",
                "primary_type": "BATTERY",
            },
        )

        self.assertEqual(response.status_code, 200)
        kwargs = captured["kwargs"]
        self.assertEqual(kwargs["month"], 4)
        self.assertEqual(kwargs["beat"], "111")
        self.assertEqual(kwargs["ward"], 22)
        self.assertEqual(kwargs["community_area"], 33)
        self.assertEqual(kwargs["district"], 9)
        self.assertFalse(kwargs["arrest"])
        self.assertTrue(kwargs["domestic"])
        self.assertEqual(kwargs["primary_type"], "BATTERY")

    def test_filter_options_route_returns_expected_shape(self):
        def fake_get_filter_options(*args, **kwargs):
            return {
                "months": [1, 2, 3],
                "beats": ["111", "112"],
                "wards": [1, 2],
                "community_areas": [10, 20],
            }

        analytics_router.analytics_service.get_filter_options = fake_get_filter_options
        client = TestClient(main.app)

        response = client.get(
            "/api/v1/analytics/filters/options",
            params={"year": 2023, "month": 2, "domestic": "true"},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["data"]["months"], [1, 2, 3])
        self.assertEqual(payload["data"]["beats"], ["111", "112"])
        self.assertEqual(payload["data"]["wards"], [1, 2])
        self.assertEqual(payload["data"]["community_areas"], [10, 20])


if __name__ == "__main__":
    unittest.main()
