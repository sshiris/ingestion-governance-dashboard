from fastapi import FastAPI
from app.routers import ingestion_runs, sources

app = FastAPI(
    title="Ingestion Governance Dashboard API",
    version="0.1.0"
)

@app.get("/")
def root():
    return {"Message": "Welcome to the Ingestion Governance Dashboard API!"}

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(ingestion_runs.router)
app.include_router(sources.router)