def get_ingestion_runs():
    return [
        {
            "id": 1,
            "source_name": "Finlex",
            "status": "completed",
            "documents_processed": 120,
            "created_at": "2026-06-26T10:30:00"
        },
        {
            "id": 2,
            "source_name": "Eurolex",
            "status": "running",
            "documents_processed": 45,
            "created_at": "2024-06-02T14:30:00"
        },              
        {
            "id": 3,
            "source_name": "Finlex",
            "status": "failed",
            "documents_processed": 8,
            "created_at": "2024-06-01T09:15:00"
        }
    ]