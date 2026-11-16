from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.schemas.environment_variable import EnvironmentVariableResponse

# Schema used when creating an environment
class EnvironmentCreate(BaseModel):
    name: str

# Schema used when updating an environment
class EnvironmentUpdate(BaseModel):
    name: str

# Schema returned to the client
class EnvironmentResponse(BaseModel):
    id: int
    api_id: int
    name: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Environment response including its variables
class EnvironmentWithVariablesResponse(BaseModel):
    id: int
    api_id: int
    name: str
    created_at: datetime
    updated_at: datetime
    variables: List[EnvironmentVariableResponse] = []

    model_config = ConfigDict(from_attributes=True)
