from fastapi import APIRouter
from app.schemas.worker import FetchRawResponse
from app.services.worker_service import mock_raw_documents

router = APIRouter(
    prefix="/worker",
    tags = ["worker"]
)
    
@router.post("/ingestion-runs/{run_id}/fetch-raw", response_model=FetchRawResponse)
def fetch_raw_document(run_id: str):
    return mock_raw_documents(run_id)
