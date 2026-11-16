import secrets
from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.mock_endpoint import MockEndpoint
    from app.models.user import User


def generate_mock_api_token() -> str:
    return secrets.token_urlsafe(24)


class MockApi(Base):
    __tablename__ = "mock_apis"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    token: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, default=generate_mock_api_token
    )
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship("User", back_populates="mock_apis")
    endpoints: Mapped[List["MockEndpoint"]] = relationship(
        "MockEndpoint", back_populates="mock_api", cascade="all, delete-orphan"
    )
