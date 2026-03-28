import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

os.environ["MYSQL_USER"] = "test_user"
os.environ["MYSQL_PASSWORD"] = "test_password"
os.environ["MYSQL_HOST"] = "127.0.0.1"
os.environ["MYSQL_PORT"] = "3306"
os.environ["MYSQL_DATABASE"] = "test_chicago_crime"

import main


class SetupApiTests(unittest.TestCase):
    def test_setup_status_shape(self):
        client = TestClient(main.app)
        response = client.get("/api/setup/status")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("database_configured", data)
        self.assertIn("percent", data)
        self.assertIn("mysql_cli_installed", data)

    @patch("app.services.setup_service.check_tcp_port_open", return_value=True)
    @patch("app.services.setup_service.check_mysql_cli_installed", return_value=(True, "mysql  Ver 8.0.0"))
    def test_check_mysql(self, _mock_cli, _mock_tcp):
        client = TestClient(main.app)
        response = client.post("/api/setup/check-mysql", json={"host": "127.0.0.1", "port": 3306})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["mysql_cli_installed"])
        self.assertTrue(data["tcp_port_open"])


if __name__ == "__main__":
    unittest.main()
