from datetime import datetime
from typing import TYPE_CHECKING, Optional, List
from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.credential import ApiCredential
    from app.models.environment import Environment
    from app.models.request import Request

class Api(Base):
    __tablename__ = "apis"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    base_url: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    auth_type: Mapped[str] = mapped_column(String(50), nullable=False, default="no_auth")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="unknown")
    openapi_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    last_checked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="apis")
    credentials: Mapped[List["ApiCredential"]] = relationship(
        "ApiCredential", back_populates="api", cascade="all, delete-orphan"
    )
    environments: Mapped[List["Environment"]] = relationship(
        "Environment", back_populates="api", cascade="all, delete-orphan"
    )
    requests: Mapped[List["Request"]] = relationship(
        "Request", back_populates="api"
    )
