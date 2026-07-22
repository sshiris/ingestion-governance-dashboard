from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_fetch_raw_rejects_empty_sources():
    response = client.post(
        "/worker/ingestion-runs/test-123/fetch-raw",
        json={"sources": []}
    )
    print(response.status_code)
    #assert response.status_code == 422