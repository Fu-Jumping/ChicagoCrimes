from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_get_geo_heatmap():
    response = client.get("/api/v1/analytics/geo/heatmap?year=2023")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == "SUCCESS"
    assert "data" in data
    # 至少应包含 lat, lng, count 字段
    if len(data["data"]) > 0:
        assert "lat" in data["data"][0]
        assert "lng" in data["data"][0]
        assert "count" in data["data"][0]
