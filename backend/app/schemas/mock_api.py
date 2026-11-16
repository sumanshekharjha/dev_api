from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict


class ManualEndpointCreate(BaseModel):
    path: str
    method: str = "GET"
    status_code: int = 200
    request_body_schema: Optional[Any] = None
    response_schema: Any


class MockApiCreate(BaseModel):
    name: str
    source_type: str = "manual"
    endpoints: Optional[List[ManualEndpointCreate]] = None


class MockEndpointPreview(BaseModel):
    method: str
    path: str
    status_code: Optional[int] = None
    request_body_schema: Optional[Any] = None
    request_body_example: Optional[Any] = None
    response_schema: Optional[Any] = None
    response_example: Optional[Any] = None


class MockApiImportPreview(BaseModel):
    title: str
    endpoints: List[MockEndpointPreview]


class MockApiResponse(BaseModel):
    id: int
    user_id: int
    name: str
    token: str
    source_type: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MockEndpointSummary(BaseModel):
    id: int
    path: str
    method: str
    status_code: int
    is_array: bool

    model_config = ConfigDict(from_attributes=True)


class MockApiListResponse(MockApiResponse):
    endpoint_count: int
    endpoints: List[MockEndpointSummary]


class MockApiGenerationResponse(MockApiResponse):
    record_count: int
