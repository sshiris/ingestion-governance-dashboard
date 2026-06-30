from fastapi import FastAPI
from app.routers import ingestion_runs, sources
from fastapi.middleware.cors import CORSMiddleware

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingestion_runs.router)
app.include_router(sources.router)