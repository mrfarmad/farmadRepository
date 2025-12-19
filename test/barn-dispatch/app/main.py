from fastapi import FastAPI
from fastapi import Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.db import SessionLocal

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/db-health", tags=["system"])
def db_health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"db": "ok"}
    except Exception as exc:
        return {"db": "error", "detail": str(exc)}


app = FastAPI(
    title="Barn Dispatching Server",
    description="Сервер мониторинга и диспетчеризации контроллеров коровников",
    version="0.1.0",
)


@app.get("/health", tags=["system"])
def health_check():
    """
    Простой health-check для проверки, что сервер жив.
    """
    return {"status": "ok"}


@app.get("/controllers", tags=["controllers"])
def list_controllers():
    """
    Заглушка: список контроллеров.
    Потом здесь будет реальное чтение из БД.
    """
    return [
        {"id": 1, "name": "Barn-1", "status": "unknown"},
        {"id": 2, "name": "Barn-2", "status": "unknown"},
    ]
