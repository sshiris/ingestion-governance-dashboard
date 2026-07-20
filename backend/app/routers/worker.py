from fastapi import APIRouter, HTTPException
from app.schemas.worker import FetchRawResponse, FetchSourceRequest
from app.services.worker_service import fetch_raw_documents

router = APIRouter(
    prefix="/worker",
    tags = ["worker"]
)
    
@router.post("/ingestion-runs/{run_id}/fetch-raw", response_model=FetchRawResponse)
def fetch_raw_documents_endpoint(run_id: str, request: FetchSourceRequest):
    try:
        return fetch_raw_documents(run_id, request.sources)
    except ValueError as error:
        print(type(error))
        print(type(str(error)))
        raise HTTPException(status_code=400, detail=str(error)) from error


