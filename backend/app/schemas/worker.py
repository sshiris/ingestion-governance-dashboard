from typing import Literal

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

sourceNames = Literal["FINLEX"]
class FetchSourceRequest(BaseModel):
    sources: list[sourceNames]