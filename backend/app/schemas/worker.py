from typing import Literal

from pydantic import BaseModel, Field

class RawDocument(BaseModel):
    source: str
    externalId: str
    title: str
    storageUrl: str
    publishedAt: str

class FetchRawResponse(BaseModel):
    rawDocuments: list[RawDocument]
    run_id: str

SourceName = Literal["FINLEX"]
class FetchSourceRequest(BaseModel):
    sources: list[SourceName] = Field(min_length=1)