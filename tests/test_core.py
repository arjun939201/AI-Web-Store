import os

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_ai_store.db")
os.environ.setdefault("CORS_ORIGINS", "http://testserver")

from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.providers.grok import GrokProvider
from backend.app.schemas import AppSpec, SearchRequest
from backend.app.services.apps import slugify


def test_health_endpoint():
    with TestClient(app) as client:
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_search_request_validation():
    assert SearchRequest(query="  expense tracker  ").query == "expense tracker"


def test_search_request_rejects_whitespace_only():
    try:
        SearchRequest(query="   ")
    except ValueError:
        pass
    else:
        raise AssertionError("Expected whitespace-only query to fail")


def test_app_spec_validation():
    spec = AppSpec(
        name="Expense Tracker",
        description="Track personal expenses",
        category="Finance",
        features=["Add expenses"],
        pages=["Dashboard"],
    )
    assert spec.name == "Expense Tracker"
    assert spec.features == ["Add expenses"]


def test_slugify_produces_safe_slug():
    assert slugify("My Expense Tracker!") == "my-expense-tracker"


def test_grok_requires_api_key(monkeypatch):
    monkeypatch.delenv("XAI_API_KEY", raising=False)
    provider = GrokProvider()
    try:
        provider.generate_app_spec("Build an expense tracker")
    except RuntimeError as exc:
        assert str(exc) == "XAI_API_KEY is not configured."
    else:
        raise AssertionError("Expected missing API key to fail")
