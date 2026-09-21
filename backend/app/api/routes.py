import logging
import os

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import App
from ..providers import get_provider
from ..schemas import AppOut, SearchRequest, SearchResponse, ShareResponse
from ..services.apps import create_app

logger = logging.getLogger(__name__)
router = APIRouter()


def to_app_out(app: App) -> AppOut:
    specification = dict(app.specification or {})
    return AppOut.model_validate(
        {
            "id": app.id,
            "slug": app.slug,
            "name": app.name,
            "description": app.description,
            "category": app.category,
            "icon": app.icon or "✦",
            "features": [feature.name for feature in app.features],
            "pages": specification.get("pages", []),
            "created_at": app.created_at,
            "updated_at": app.updated_at,
            "specification": specification,
        }
    )


@router.post("/search", response_model=SearchResponse)
def search(payload: SearchRequest, request: Request, db: Session = Depends(get_db)):
    try:
        spec = get_provider().generate_app_spec(payload.query)
        app = create_app(db, spec)
        return {"app": to_app_out(app)}
    except Exception:
        db.rollback()
        logger.exception(
            "AI app generation failed request_id=%s",
            getattr(request.state, "request_id", "unknown"),
        )
        raise HTTPException(
            status_code=502,
            detail="AI generation is temporarily unavailable. Please try again.",
        )


@router.post("/apps/generate", response_model=SearchResponse)
def generate(
    payload: SearchRequest, request: Request, db: Session = Depends(get_db)
):
    return search(payload, request, db)


@router.get("/apps", response_model=list[AppOut])
def list_apps(db: Session = Depends(get_db)):
    apps = (
        db.query(App)
        .options(selectinload(App.features))
        .order_by(App.created_at.desc())
        .limit(50)
        .all()
    )
    return [to_app_out(app) for app in apps]


@router.get("/apps/{app_id}", response_model=AppOut)
def get_app(app_id: str, db: Session = Depends(get_db)):
    query = db.query(App).options(selectinload(App.features))
    app = query.filter(App.slug == app_id).first()
    if not app and app_id.isdigit():
        app = query.filter(App.id == int(app_id)).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return to_app_out(app)


@router.post("/apps/{app_id}/share", response_model=ShareResponse)
def share_app(app_id: str, db: Session = Depends(get_db)):
    app = db.query(App).filter(App.slug == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    base = os.getenv("PUBLIC_APP_URL", "http://localhost:5173").rstrip("/")
    return {"url": f"{base}/app/{app.slug}"}
