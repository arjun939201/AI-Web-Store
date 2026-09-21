from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=2000)

    @field_validator("query")
    @classmethod
    def validate_query(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Query must contain at least 2 non-whitespace characters.")
        return value


class AppSpec(BaseModel):
    name: str = Field(min_length=1, max_length=180)
    description: str = Field(min_length=1, max_length=2000)
    category: str = Field(min_length=1, max_length=100)
    features: list[str] = Field(default_factory=list, max_length=30)
    pages: list[str] = Field(default_factory=list, max_length=30)
    icon: str = Field(default="✦", min_length=1, max_length=16)

    @field_validator("icon", mode="before")
    @classmethod
    def normalize_icon(cls, value: object) -> str:
        # AI output is untrusted. Icons are display symbols, not asset paths,
        # URLs, or executable content. Fall back safely when a provider returns
        # a filename such as "attendance_icon.png".
        if not isinstance(value, str):
            return "✦"
        value = value.strip()
        if not value or len(value) > 16 or any(char in value for char in "/\\") or "." in value:
            return "✦"
        return value


class AppOut(AppSpec):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    created_at: datetime
    updated_at: datetime
    specification: dict[str, Any]


class SearchResponse(BaseModel):
    app: AppOut


class ShareResponse(BaseModel):
    url: str
