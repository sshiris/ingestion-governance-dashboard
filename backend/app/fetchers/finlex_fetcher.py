from datetime import datetime, timezone
def fetch_finlex_documents(run_id: str) -> list[dict]:
    published_at = datetime.now(timezone.utc).isoformat()
    
    return [
        {
            "source": "FINLEX",
            "externalId": f"finlex-{run_id}-1",
            "title": "Sample FINLEX Document",
            "storageUrl": f"https://example.invalid/finlex/{run_id}/1",
            "publishedAt": published_at,
        }
    ]