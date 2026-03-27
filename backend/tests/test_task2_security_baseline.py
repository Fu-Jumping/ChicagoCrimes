import importlib
import json
import os
import sys
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

os.environ["MYSQL_USER"] = "test_user"
os.environ["MYSQL_PASSWORD"] = "test_password"
os.environ["MYSQL_HOST"] = "127.0.0.1"
os.environ["MYSQL_PORT"] = "3306"
os.environ["MYSQL_DATABASE"] = "test_chicago_crime"

import main


class _FailingSession:
    def __enter__(self):
        raise RuntimeError("db_connect_failed password=123456")

    def __exit__(self, exc_type, exc_val, exc_tb):
        return False


class Task2SecurityBaselineTests(unittest.TestCase):
    def setUp(self):
        self.previous_env = {
            key: os.environ.get(key)
            for key in ("MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_HOST", "MYSQL_PORT", "MYSQL_DATABASE")
        }

    def tearDown(self):
        for key, value in self.previous_env.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value

    def test_database_default_credentials_blocked(self):
        os.environ["MYSQL_USER"] = "root"
        os.environ["MYSQL_PASSWORD"] = "123456"
        os.environ["MYSQL_DATABASE"] = "chicago_crime"
        sys.modules.pop("app.database", None)
        with self.assertRaisesRegex(RuntimeError, "启动阻断"):
            importlib.import_module("app.database")

    def test_cors_origin_list_parse_from_env(self):
        with patch.dict(os.environ, {"CORS_ALLOWED_ORIGINS": " http://localhost:5173,https://app.example.com,http://localhost:5173 "}):
            origins = main.parse_cors_allowed_origins()
        self.assertEqual(origins, ["http://localhost:5173", "https://app.example.com"])

    def test_healthz_masks_error_and_keeps_request_id_trace(self):
        client = TestClient(main.app)
        with patch("main.SessionLocal", return_value=_FailingSession()):
            with patch.object(main.logger, "exception") as mocked_exception:
                response = client.get("/healthz")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "degraded")
        self.assertEqual(payload["dependencies"]["database"]["error"], "DATABASE_UNAVAILABLE")
        self.assertIn("request_id", payload)
        self.assertNotIn("password=123456", json.dumps(payload, ensure_ascii=False))
        mocked_exception.assert_called_once()


if __name__ == "__main__":
    unittest.main()
