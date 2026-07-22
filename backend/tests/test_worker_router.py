from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_fetch_raw_rejects_empty_sources():
    response = client.post(
        "/worker/ingestion-runs/test-123/fetch-raw",
        json={"sources": []}
    )
    assert response.status_code == 422
    
def test_fetch_raw_rejects_invalid_source():
    response = client.post(
        "/worker/ingestion-runs/test-123/fetch-raw",
        json={"sources": ["INVALID_SOURCE"]}
    )
    assert response.status_code == 422

def test_fetch_missing_sources_field():
    response = client.post(
        "/worker/ingestion-runs/test-123/fetch-raw",
        json={}
    )
    assert response.status_code == 422