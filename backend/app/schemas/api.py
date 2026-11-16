from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

# Schema used when creating a new API in the Vault
class ApiCreate(BaseModel):
    name: str
    base_url: str
    description: Optional[str] = None
    auth_type: str = "no_auth"
    openapi_url: Optional[str] = None

# Schema used when updating an existing API
class ApiUpdate(BaseModel):
    name: Optional[str] = None
    base_url: Optional[str] = None
    description: Optional[str] = None
    auth_type: Optional[str] = None
    status: Optional[str] = None
    openapi_url: Optional[str] = None

# Schema returned to the client
class ApiResponse(BaseModel):
    id: int
    user_id: int
    name: str
    base_url: str
    description: Optional[str] = None
    auth_type: str
    status: str
    openapi_url: Optional[str] = None
    last_checked_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
