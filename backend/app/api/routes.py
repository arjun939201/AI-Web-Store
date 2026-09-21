import os
from fastapi import APIRouter,Depends,HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import App
from ..schemas import SearchRequest,SearchResponse,AppOut,ShareResponse
from ..providers import get_provider
from ..services.apps import create_app
router=APIRouter()
@router.post("/search",response_model=SearchResponse)
def search(payload:SearchRequest,db:Session=Depends(get_db)):
 try:
  spec=get_provider().generate_app_spec(payload.query); app=create_app(db,spec); return {"app":AppOut.model_validate(app)}
 except Exception as exc:
  db.rollback(); raise HTTPException(status_code=502,detail=f"AI generation failed: {exc}")
@router.post("/apps/generate",response_model=SearchResponse)
def generate(payload:SearchRequest,db:Session=Depends(get_db)): return search(payload,db)
@router.get("/apps",response_model=list[AppOut])
def list_apps(db:Session=Depends(get_db)): return [AppOut.model_validate(a) for a in db.query(App).order_by(App.created_at.desc()).limit(50).all()]
@router.get("/apps/{app_id}",response_model=AppOut)
def get_app(app_id:str,db:Session=Depends(get_db)):
 app=db.query(App).filter(App.slug==app_id).first()
 if not app and app_id.isdigit(): app=db.query(App).filter(App.id==int(app_id)).first()
 if not app: raise HTTPException(status_code=404,detail="Application not found")
 return AppOut.model_validate(app)
@router.post("/apps/{app_id}/share",response_model=ShareResponse)
def share_app(app_id:str,db:Session=Depends(get_db)):
 app=db.query(App).filter(App.slug==app_id).first()
 if not app: raise HTTPException(status_code=404,detail="Application not found")
 base=os.getenv("PUBLIC_APP_URL","http://localhost:5173")
 return {"url":f"{base.rstrip('/')}/app/{app.slug}"}
