from fastapi import APIRouter
from app.schemas.ingestion_run import IngestionRun
from app.services.ingestion_run_service import get_ingestion_runs
    
router = APIRouter(
    prefix = "/ingestion_runs",
    tags = ["ingestion_runs"]
)

@router.get("/", response_model=list[IngestionRun])
def list_ingestion_runs():
    return get_ingestion_runs()