from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

# Schema used when creating a new collection
class CollectionCreate(BaseModel):
    name: str
    description: Optional[str] = None

# Schema used when updating a collection
class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

# Schema returned to the client
class CollectionResponse(BaseModel):
    id: int
    user_id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
