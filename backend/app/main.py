from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"Message": "Welcome to the Ingestion Governance Dashboard API!"}

@app.get("/health")
def health():
    return {"status": "ok"}