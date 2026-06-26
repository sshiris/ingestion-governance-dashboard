from pydantic import BaseModel

class IngestionRun(BaseModel):
    id: int
    source_name: str
    status: str
    documents_processed: int
    created_at: str