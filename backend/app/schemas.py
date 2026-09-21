from datetime import datetime
from typing import Any, Literal

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


ComponentType = Literal[
    "heading", "text", "button", "input", "textarea", "select", "checkbox",
    "stat", "list", "table", "card", "chart", "game_board",
    "data_form", "data_table", "data_summary"
]

FieldType = Literal["text", "number", "boolean", "date", "select"]


class RuntimeField(BaseModel):
    model_config = ConfigDict(extra="forbid")

    key: str = Field(min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=120)
    type: FieldType = "text"
    required: bool = False
    default: Any = None
    options: list[str] = Field(default_factory=list, max_length=20)


class RuntimeEntity(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=80)
    fields: list[RuntimeField] = Field(min_length=1, max_length=20)
    seed: list[dict[str, Any]] = Field(default_factory=list, max_length=20)



class AppComponent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: ComponentType
    label: str = Field(default="", max_length=120)
    text: str = Field(default="", max_length=500)
    placeholder: str = Field(default="", max_length=200)
    data_key: str = Field(default="", max_length=120)
    action: str = Field(default="", max_length=120)
    options: list[str] = Field(default_factory=list, max_length=20)
    entity: str = Field(default="", max_length=80)
    fields: list[str] = Field(default_factory=list, max_length=20)
    aggregate: Literal["count", "sum", "avg"] = "count"
    limit: int = Field(default=50, ge=1, le=100)


class RuntimePage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=100)
    components: list[AppComponent] = Field(default_factory=list, max_length=20)


class RuntimeSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")

    app_type: Literal[
        "general", "productivity", "finance", "education", "game",
        "navigation", "health", "business", "social", "portfolio", "utility"
    ] = "general"
    pages: list[RuntimePage] = Field(default_factory=list, max_length=20)
    entities: list[RuntimeEntity] = Field(default_factory=list, max_length=10)


class AppSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=180)
    description: str = Field(min_length=1, max_length=2000)
    category: str = Field(min_length=1, max_length=100)
    features: list[str] = Field(default_factory=list, max_length=30)
    pages: list[str] = Field(default_factory=list, max_length=30)
    icon: str = Field(default="✦", min_length=1, max_length=16)
    runtime: RuntimeSpec = Field(default_factory=RuntimeSpec)

    @field_validator("icon", mode="before")
    @classmethod
    def normalize_icon(cls, value: object) -> str:
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
