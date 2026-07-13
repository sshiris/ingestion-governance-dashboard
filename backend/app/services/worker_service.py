from app.fetchers.finlex_fetcher import fetch_finlex_documents

def fetch_raw_documents(run_id: str, sources: list[str]):
    documents = []
    
    for source in sources:
        if source == "FINLEX":
            documents.extend(fetch_finlex_documents(run_id))
        else:
            raise ValueError(f"Unsupported source: {source}")
    return {
        "rawDocuments": documents,
        "run_id": run_id
    }