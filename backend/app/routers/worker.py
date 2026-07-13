from fastapi import APIRouter
from app.schemas.worker import FetchRawResponse, FetchSourceRequest
from app.services.worker_service import fetch_raw_documents

router = APIRouter(
    prefix="/worker",
    tags = ["worker"]
)
    
@router.post("/ingestion-runs/{run_id}/fetch-raw", response_model=FetchRawResponse)
def fetch_raw_documents_endpoint(run_id: str, request: FetchSourceRequest):
    return fetch_raw_documents(run_id, request.sources)


