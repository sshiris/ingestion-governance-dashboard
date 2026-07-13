from datetime import datetime, timezone

def mock_raw_documents(run_id: str):
    published_at = datetime.now(timezone.utc).isoformat()
    return {
        "run_id": run_id,
        "rawDocuments": [
            {
                "source" : "FINLEX",
                "externalId": f"fastapi-{run_id}-1",
                "title": "Sample Document 1",
                "storageUrl": f"https://example.invalid/raw/{run_id}/1",
                "publishedAt": published_at
            },
            {
                "source" : "EUROLEX",
                "externalId": f"fastapi-{run_id}-2",
                "title": "mock data processing regulation",
                "storageUrl": f"https://example.invalid/raw/{run_id}/2",
                "publishedAt": published_at
            }
        ]
    }