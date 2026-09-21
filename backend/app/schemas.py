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
