from datetime import datetime
from typing import Optional, Any, Dict
from pydantic import BaseModel, ConfigDict, field_validator

ALLOWED_METHODS = {"GET", "POST", "PUT", "PATCH", "DELETE"}

# Schema used when creating a request
class RequestCreate(BaseModel):
    name: str
    method: str = "GET"
    url: str
    collection_id: Optional[int] = None
    api_id: Optional[int] = None
    params: Optional[Any] = None
    headers: Optional[Any] = None
    auth: Optional[Any] = None
    body: Optional[Any] = None

    @field_validator("method")
    @classmethod
    def validate_method(cls, v: str) -> str:
        upper_v = v.strip().upper()
        if upper_v not in ALLOWED_METHODS:
            raise ValueError(f"Method must be one of: {', '.join(sorted(ALLOWED_METHODS))}")
        return upper_v

# Schema used when updating a request
class RequestUpdate(BaseModel):
    name: Optional[str] = None
    method: Optional[str] = None
    url: Optional[str] = None
    collection_id: Optional[int] = None
    api_id: Optional[int] = None
    params: Optional[Any] = None
    headers: Optional[Any] = None
    auth: Optional[Any] = None
    body: Optional[Any] = None

    @field_validator("method")
    @classmethod
    def validate_method(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        upper_v = v.strip().upper()
        if upper_v not in ALLOWED_METHODS:
            raise ValueError(f"Method must be one of: {', '.join(sorted(ALLOWED_METHODS))}")
        return upper_v

# Schema returned to the client
class RequestResponse(BaseModel):
    id: int
    collection_id: Optional[int] = None
    api_id: Optional[int] = None
    name: str
    method: str
    url: str
    params: Optional[Any] = None
    headers: Optional[Any] = None
    auth: Optional[Any] = None
    body: Optional[Any] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator("headers", mode="before")
    @classmethod
    def redact_sensitive_headers(cls, value: Any) -> Any:
        if not isinstance(value, dict):
            return value
        sensitive = {"authorization", "proxy-authorization", "cookie", "x-api-key", "api-key"}
        return {key: item for key, item in value.items() if key.lower() not in sensitive}

    @field_validator("auth", mode="before")
    @classmethod
    def redact_auth_data(cls, value: Any) -> Any:
        if not isinstance(value, dict):
            return value
        auth_type = value.get("auth_type")
        return {"auth_type": auth_type} if auth_type else None

# Schema for live test request execution
class TestExecutionRequest(BaseModel):
    method: str
    url: str
    query_params: Optional[Any] = None
    headers: Optional[Any] = None
    auth_type: Optional[str] = None
    auth_data: Optional[Any] = None
    body: Optional[Any] = None
    collection_id: Optional[int] = None
    api_id: Optional[int] = None
    request_id: Optional[int] = None

# Schema returned after live test request execution
class TestExecutionResponse(BaseModel):
    status_code: int
    headers: Dict[str, str]
    body: Any
    time_ms: int
    size_bytes: int
    error: Optional[str] = None
    auth_notice: Optional[str] = None
