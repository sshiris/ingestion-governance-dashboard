from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime
router = APIRouter(
    prefix="/worker",
    tags = ["worker"]
)

class RawDocument(BaseModel):
    source: str
    externalId: str
    title: str
    storageUrl: str
    publishedAt: str
    
class FetchRawResponse(BaseModel):
    rawDocuments: list[RawDocument]
    run_id: str
    
@router.post("/ingestion-runs/{run_id}/fetch-raw", response_model=FetchRawResponse)
def fetch_raw_document(run_id: str):
    return {
        "run_id": run_id,
        "rawDocuments": [
            {
                "source" : "FINLEX",
                "externalId": f"fastapi-{run_id}-1",
                "title": "Sample Document 1",
                "storageUrl": f"https://example.invalid/raw/{run_id}/1",
                "publishedAt": datetime.utcnow().isoformat()
            },
            {
                "source" : "EUROLEX",
                "externalId": f"fastapi-{run_id}-2",
                "title": "mock data processing regulation",
                "storageUrl": f"https://example.invalid/raw/{run_id}/2",
                "publishedAt": datetime.utcnow().isoformat()
            }
        ]
    }

