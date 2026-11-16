from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

# Schema used when creating a new credential
class CredentialCreate(BaseModel):
    name: str
    type: str  # e.g., 'api_key', 'bearer_token', 'basic_auth', 'custom_header'
    value: str
    expires_at: Optional[datetime] = None

# Schema used when updating an existing credential
class CredentialUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    value: Optional[str] = None
    expires_at: Optional[datetime] = None

# Schema returned to the client (Secret values are never returned raw)
class CredentialResponse(BaseModel):
    id: int
    api_id: int
    name: str
    type: str
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    # Value is masked for safety so secrets are not exposed in GET requests
    masked_value: str = "••••••••"

    model_config = ConfigDict(from_attributes=True)
