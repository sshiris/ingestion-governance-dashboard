from app.schemas.source import Source

def get_sources():
    return [
        {
            "id" : 1,
            "name": "Finlex",
            "type": "Education",
            "status": "Active"
        },
        {
            "id" : 2,
            "name": "Eurolex",
            "type": "Government",
            "status": "Active"
        },
        {
            "id" : 3,
            "name": "Finlex",
            "type": "documentation",
            "status": "Inactive"
        }
    
    ]