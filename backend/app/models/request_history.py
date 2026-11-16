from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import String, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.request import Request

class RequestHistory(Base):
    __tablename__ = "request_history"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    
    # request_id is nullable: ad-hoc requests that were never saved still get history logs
    request_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("requests.id", ondelete="SET NULL"), nullable=True, index=True
    )

    method: Mapped[str] = mapped_column(String(10), nullable=False)
    url: Mapped[str] = mapped_column(String(1000), nullable=False)
    status_code: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    response_time: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # in ms
    response_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # in bytes

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="request_history")
    request: Mapped[Optional["Request"]] = relationship(
        "Request", back_populates="history"
    )
