from fastapi import APIRouter
from app.services.source_service import get_sources
from app.schemas.source import Source


router = APIRouter(
    prefix ="/sources",
    tags = ["sources"]
)

@router.get("/", response_model=list[Source])
def get_sources():
    return get_sources()