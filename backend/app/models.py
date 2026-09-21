from datetime import datetime,timezone
from sqlalchemy import Column,Integer,String,Text,DateTime,ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship
from .database import Base
JsonType=JSON().with_variant(JSONB,"postgresql")
def now(): return datetime.now(timezone.utc)
class User(Base):
 __tablename__="users"; id=Column(Integer,primary_key=True); email=Column(String(320),unique=True,nullable=False,index=True); name=Column(String(120)); created_at=Column(DateTime(timezone=True),default=now,nullable=False); apps=relationship("App",back_populates="creator"); credentials=relationship("UserCredential",back_populates="user",uselist=False,cascade="all, delete-orphan")
class UserCredential(Base):
 __tablename__="user_credentials"; id=Column(Integer,primary_key=True); user_id=Column(Integer,ForeignKey("users.id"),unique=True,nullable=False,index=True); password_salt=Column(String(64),nullable=False); password_hash=Column(String(128),nullable=False); created_at=Column(DateTime(timezone=True),default=now,nullable=False); user=relationship("User",back_populates="credentials")
class App(Base):
 __tablename__="apps"; id=Column(Integer,primary_key=True); slug=Column(String(180),unique=True,nullable=False,index=True); name=Column(String(180),nullable=False); description=Column(Text,nullable=False); icon=Column(String(32),default="✦"); category=Column(String(100),nullable=False); specification=Column(JsonType,nullable=False); creator_id=Column(Integer,ForeignKey("users.id")); created_at=Column(DateTime(timezone=True),default=now,nullable=False); updated_at=Column(DateTime(timezone=True),default=now,onupdate=now,nullable=False); creator=relationship("User",back_populates="apps"); features=relationship("AppFeature",cascade="all, delete-orphan",back_populates="app"); versions=relationship("AppVersion",cascade="all, delete-orphan",back_populates="app")
class AppFeature(Base):
 __tablename__="app_features"; id=Column(Integer,primary_key=True); app_id=Column(Integer,ForeignKey("apps.id"),nullable=False); name=Column(String(180),nullable=False); description=Column(Text); app=relationship("App",back_populates="features")
class AppVersion(Base):
 __tablename__="app_versions"; id=Column(Integer,primary_key=True); app_id=Column(Integer,ForeignKey("apps.id"),nullable=False); version=Column(String(40),nullable=False); specification=Column(JsonType,nullable=False); created_at=Column(DateTime(timezone=True),default=now,nullable=False); app=relationship("App",back_populates="versions")
