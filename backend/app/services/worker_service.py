from app.fetchers.finlex_fetcher import fetch_finlex_documents

def fetch_raw_documents(run_id: str):
    finlex_raw_documents = fetch_finlex_documents(run_id)
    return {
        "rawDocuments": finlex_raw_documents,
        "run_id": run_id
    }