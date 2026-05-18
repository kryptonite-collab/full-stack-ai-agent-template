"""RAG API schemas."""

from typing import Any

from pydantic import BaseModel, Field


class RAGSearchRequest(BaseModel):
    """Parameters for a vector search query."""

    collection_name: str = Field("documents", description="Target collection for search")
    collection_names: list[str] | None = Field(
        None, description="Search across multiple collections (overrides collection_name)"
    )
    query: str = Field(..., description="Natural language search query")
    limit: int = Field(default=4, ge=1, le=20)
    min_score: float = Field(default=0.0, ge=0.0, le=1.0)
    filter: str | None = Field(
        None, description="Scalar filter expression (e.g. 'filetype == \"pdf\"')"
    )


class RAGSearchResult(BaseModel):
    """A single retrieved chunk with its associated metadata."""

    content: str
    score: float
    metadata: dict[str, Any]
    parent_doc_id: str


class RAGSearchResponse(BaseModel):
    """List of results found in the vector store."""

    results: list[RAGSearchResult]


class RAGCollectionInfo(BaseModel):
    """Statistical information about a specific collection."""

    name: str
    total_vectors: int
    dim: int
    indexing_status: str = "complete"


class RAGCollectionList(BaseModel):
    """List of all available collection names."""

    items: list[str]


class RAGDocumentItem(BaseModel):
    """Information about a single document in a collection."""

    document_id: str = Field(..., description="Unique identifier of the document")
    filename: str | None = Field(None, description="Original filename of the document")
    filesize: int | None = Field(None, description="Size of the file in bytes")
    filetype: str | None = Field(None, description="MIME type of the file")
    chunk_count: int = Field(default=0, description="Number of chunks/vectors in the collection")
    additional_info: dict[str, Any] | None = Field(None, description="Additional metadata")


class RAGDocumentList(BaseModel):
    """List of all documents in a collection."""

    items: list[RAGDocumentItem]
    total: int = Field(..., description="Total number of unique documents")


class RAGMessageResponse(BaseModel):
    """Simple message response."""

    message: str
