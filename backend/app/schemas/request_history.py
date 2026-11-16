from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

# Schema used when recording history
class RequestHistoryCreate(BaseModel):
    request_id: Optional[int] = None
    method: str
    url: str
    status_code: Optional[int] = None
    response_time: Optional[int] = None
    response_size: Optional[int] = None

# Schema returned to client
class RequestHistoryResponse(BaseModel):
    id: int
    user_id: int
    request_id: Optional[int] = None
    method: str
    url: str
    status_code: Optional[int] = None
    response_time: Optional[int] = None
    response_size: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
