import logging
import os
import time
from urllib.parse import urlsplit

from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ai_store.db")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=1800,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)

Base = declarative_base()


def _database_target():
    if DATABASE_URL.startswith("sqlite"):
        return "sqlite"
    try:
        return urlsplit(DATABASE_URL).hostname or "postgres"
    except ValueError:
        return "postgres"


def init_db(retries=10, delay_seconds=3.0):
    from .models import App, AppFeature, AppVersion, User, UserCredential

    for attempt in range(1, retries + 1):
        try:
            Base.metadata.create_all(bind=engine)
            logger.info("Database initialized target=%s", _database_target())
            return
        except OperationalError:
            if attempt == retries:
                logger.exception(
                    "Database initialization failed after %s attempts target=%s",
                    retries,
                    _database_target(),
                )
                raise
            logger.warning(
                "Database unavailable on attempt %s/%s target=%s; retrying in %.1fs",
                attempt,
                retries,
                _database_target(),
                delay_seconds,
            )
            time.sleep(delay_seconds)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
