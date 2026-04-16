import os
import unittest

os.environ["MYSQL_USER"] = "test_user"
os.environ["MYSQL_PASSWORD"] = "test_password"
os.environ["MYSQL_HOST"] = "127.0.0.1"
os.environ["MYSQL_PORT"] = "3306"
os.environ["MYSQL_DATABASE"] = "test_chicago_crime"

import main


class BackendWarmupPathsTests(unittest.TestCase):
    def test_warmup_paths_cover_requirements_page_cold_start_variants(self):
        self.assertIn("/api/v1/analytics/location/types?limit=10", main.WARM_UP_PATHS)
        self.assertIn("/api/v1/analytics/types/seasonal_compare?limit=8", main.WARM_UP_PATHS)


if __name__ == "__main__":
    unittest.main()
