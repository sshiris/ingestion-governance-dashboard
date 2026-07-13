from pydantic import BaseModel

class RawDocument(BaseModel):
    source: str
    externalId: str
    title: str
    storageUrl: str
    publishedAt: str

class FetchRawResponse(BaseModel):
    rawDocuments: list[RawDocument]
    run_id: str