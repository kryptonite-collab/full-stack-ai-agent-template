from typing import Any

from pydantic import BaseModel, Field


class BadcaseItem(BaseModel):
    id: str | None = None
    question_id: str | None = None
    question: str
    category: str | None = None
    answer: str | None = None
    expected_keywords: list[str] = Field(default_factory=list)
    missing_keywords: list[str] = Field(default_factory=list)
    expected_source: str | None = None
    retrieved_sources: list[str] = Field(default_factory=list)
    score: float | None = None
    reason: str
    created_at: str | None = None


class BadcaseListResponse(BaseModel):
    total: int
    items: list[BadcaseItem]


class BadcaseReplayResponse(BaseModel):
    id: str | None = None
    question: str
    answer: str
    contexts: list[dict[str, Any]]
    latency_ms: float
    model: str
    original_badcase: BadcaseItem
