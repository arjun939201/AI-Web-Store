import re
from ..models import App,AppFeature,AppVersion
def slugify(v): return re.sub(r"[-\s]+","-",re.sub(r"[^a-zA-Z0-9\s-]","",v).strip().lower())[:160] or "ai-app"
def unique_slug(db,v):
 base=slugify(v); slug=base; n=2
 while db.query(App).filter(App.slug==slug).first(): slug=f"{base}-{n}"; n+=1
 return slug
def create_app(db,spec):
 app=App(slug=unique_slug(db,spec.name),name=spec.name,description=spec.description,icon=spec.icon,category=spec.category,specification=spec.model_dump())
 db.add(app); db.flush()
 for f in spec.features: db.add(AppFeature(app_id=app.id,name=f))
 db.add(AppVersion(app_id=app.id,version="1.0.0",specification=spec.model_dump()))
 db.commit(); db.refresh(app); return app
