import logging
import os

from fastapi import APIRouter, Body, Depends, HTTPException, Request
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import App, AppRecord, User, UserCredential
from ..providers import get_provider
from ..schemas import AppOut, AuthRequest, AuthResponse, SearchRequest, SearchResponse, ShareResponse, UserOut
from ..services.apps import create_app
from ..security import create_access_token, get_current_user, hash_password, verify_password

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


def generate_and_store(payload: SearchRequest, request: Request, db: Session, current_user: User):
    try:
        spec = get_provider().generate_app_spec(payload.query)
    except Exception:
        logger.exception(
            "AI app generation failed request_id=%s",
            getattr(request.state, "request_id", "unknown"),
        )
        raise HTTPException(
            status_code=502,
            detail="AI generation is temporarily unavailable. Please try again.",
        )

    try:
        app = create_app(db, spec, creator_id=current_user.id)
        return {"app": to_app_out(app)}
    except SQLAlchemyError:
        db.rollback()
        logger.exception(
            "AI app persistence failed request_id=%s",
            getattr(request.state, "request_id", "unknown"),
        )
        raise HTTPException(
            status_code=503,
            detail="Application storage is temporarily unavailable. Please try again.",
        )


@router.post("/auth/register", response_model=AuthResponse, status_code=201)
def register(payload: AuthRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    salt, password_hash = hash_password(payload.password)
    user = User(email=payload.email, name=payload.name or payload.email.split("@")[0])
    user.credentials = UserCredential(password_salt=salt, password_hash=password_hash)
    try:
        db.add(user)
        db.flush()
        # Mint token before commit so missing auth configuration cannot leave
        # a newly-created account behind when registration returns an error.
        token = create_access_token(user.id)
        db.commit()
        db.refresh(user)
    except RuntimeError:
        db.rollback()
        logger.exception("Authentication secret is unavailable during registration")
        raise HTTPException(
            status_code=503,
            detail="Authentication service is temporarily unavailable.",
        )
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Account registration failed")
        raise HTTPException(status_code=409, detail="Unable to create this account.")
    return {"token": token, "user": UserOut.model_validate(user, from_attributes=True)}


@router.post("/auth/login", response_model=AuthResponse)
def login(payload: AuthRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.credentials or not verify_password(payload.password, user.credentials.password_salt, user.credentials.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    try:
        token = create_access_token(user.id)
    except RuntimeError:
        logger.exception("Authentication secret is unavailable during login")
        raise HTTPException(
            status_code=503,
            detail="Authentication service is temporarily unavailable.",
        )
    return {"token": token, "user": UserOut.model_validate(user, from_attributes=True)}



@router.get("/auth/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user, from_attributes=True)


@router.post("/search", response_model=SearchResponse)
def search(payload: SearchRequest, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return generate_and_store(payload, request, db, current_user)


@router.post("/apps/generate", response_model=SearchResponse)
def generate(
    payload: SearchRequest, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return generate_and_store(payload, request, db, current_user)


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
    return {"url": f"{base}/run/{app.slug}"}


def _record_context(app_slug: str, entity_name: str, db: Session, current_user: User):
    app = db.query(App).filter(App.slug == app_slug).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    runtime = (app.specification or {}).get("runtime") or {}
    entities = runtime.get("entities") or []
    entity = next((item for item in entities if item.get("name") == entity_name), None)
    if entity is None:
        raise HTTPException(status_code=404, detail="Data entity not found")
    return app, entity


def _validate_record_data(entity: dict, data: dict, *, partial: bool = False):
    if not isinstance(data, dict):
        raise HTTPException(status_code=422, detail="Record data must be an object")
    fields = {item["key"]: item for item in entity.get("fields", []) if isinstance(item, dict) and "key" in item}
    unknown = set(data) - set(fields)
    if unknown:
        raise HTTPException(status_code=422, detail=f"Unknown fields: {', '.join(sorted(unknown))}")
    if not partial:
        missing = [key for key, field in fields.items() if field.get("required") and key not in data]
        if missing:
            raise HTTPException(status_code=422, detail=f"Missing required fields: {', '.join(missing)}")
    for key, value in data.items():
        field = fields[key]
        kind = field.get("type", "text")
        valid = (
            (kind == "text" and isinstance(value, str))
            or (kind == "number" and isinstance(value, (int, float)) and not isinstance(value, bool))
            or (kind == "boolean" and isinstance(value, bool))
            or (kind == "date" and isinstance(value, str))
            or (kind == "select" and isinstance(value, str) and value in (field.get("options") or []))
        )
        if not valid:
            raise HTTPException(status_code=422, detail=f"Invalid value for field: {key}")


def _record_out(record: AppRecord):
    return {
        "id": record.id,
        "entity": record.entity,
        "data": record.payload,
        "created_at": record.created_at,
        "updated_at": record.updated_at,
    }


@router.get("/apps/{app_slug}/data/{entity_name}")
def list_app_records(
    app_slug: str,
    entity_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app, _ = _record_context(app_slug, entity_name, db, current_user)
    rows = (
        db.query(AppRecord)
        .filter(
            AppRecord.app_id == app.id,
            AppRecord.user_id == current_user.id,
            AppRecord.entity == entity_name,
        )
        .order_by(AppRecord.created_at.desc())
        .limit(500)
        .all()
    )
    return [_record_out(row) for row in rows]


@router.post("/apps/{app_slug}/data/{entity_name}", status_code=201)
def create_app_record(
    app_slug: str,
    entity_name: str,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app, entity = _record_context(app_slug, entity_name, db, current_user)
    _validate_record_data(entity, data)
    record = AppRecord(app_id=app.id, user_id=current_user.id, entity=entity_name, payload=data)
    db.add(record)
    db.commit()
    db.refresh(record)
    return _record_out(record)


@router.patch("/apps/{app_slug}/data/{entity_name}/{record_id}")
def update_app_record(
    app_slug: str,
    entity_name: str,
    record_id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app, entity = _record_context(app_slug, entity_name, db, current_user)
    record = (
        db.query(AppRecord)
        .filter(
            AppRecord.id == record_id,
            AppRecord.app_id == app.id,
            AppRecord.user_id == current_user.id,
            AppRecord.entity == entity_name,
        )
        .first()
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Record not found")
    _validate_record_data(entity, data, partial=True)
    record.payload = {**(record.payload or {}), **data}
    _validate_record_data(entity, record.payload)
    db.commit()
    db.refresh(record)
    return _record_out(record)


@router.delete("/apps/{app_slug}/data/{entity_name}/{record_id}", status_code=204)
def delete_app_record(
    app_slug: str,
    entity_name: str,
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app, _ = _record_context(app_slug, entity_name, db, current_user)
    record = (
        db.query(AppRecord)
        .filter(
            AppRecord.id == record_id,
            AppRecord.app_id == app.id,
            AppRecord.user_id == current_user.id,
            AppRecord.entity == entity_name,
        )
        .first()
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(record)
    db.commit()
