import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base,sessionmaker
DATABASE_URL=os.getenv("DATABASE_URL","sqlite:///./ai_store.db")
if DATABASE_URL.startswith("postgres://"): DATABASE_URL=DATABASE_URL.replace("postgres://","postgresql+psycopg://",1)
elif DATABASE_URL.startswith("postgresql://"): DATABASE_URL=DATABASE_URL.replace("postgresql://","postgresql+psycopg://",1)
engine=create_engine(DATABASE_URL,pool_pre_ping=True)
SessionLocal=sessionmaker(bind=engine,autoflush=False,autocommit=False)
Base=declarative_base()
def init_db():
 from .models import User,App,AppFeature,AppVersion
 Base.metadata.create_all(bind=engine)
def get_db():
 db=SessionLocal()
 try: yield db
 finally: db.close()
