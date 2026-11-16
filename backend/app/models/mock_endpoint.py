from datetime import datetime
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.mock_api import MockApi


class MockEndpoint(Base):
    __tablename__ = "mock_endpoints"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    mock_api_id: Mapped[int] = mapped_column(
        ForeignKey("mock_apis.id", ondelete="CASCADE"), nullable=False, index=True
    )
    path: Mapped[str] = mapped_column(String(1000), nullable=False)
    method: Mapped[str] = mapped_column(String(10), nullable=False)
    status_code: Mapped[int] = mapped_column(Integer, nullable=False)
    request_body: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    response_body: Mapped[Any] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    mock_api: Mapped["MockApi"] = relationship("MockApi", back_populates="endpoints")
