from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

# Schema used when creating an environment variable
class EnvironmentVariableCreate(BaseModel):
    key: str
    value: str
    is_secret: bool = False

# Schema used when updating an environment variable
class EnvironmentVariableUpdate(BaseModel):
    key: Optional[str] = None
    value: Optional[str] = None
    is_secret: Optional[bool] = None

# Schema returned to the client
class EnvironmentVariableResponse(BaseModel):
    id: int
    environment_id: int
    key: str
    value: str
    is_secret: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
