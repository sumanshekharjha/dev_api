from datetime import datetime
from typing import TYPE_CHECKING, Optional, List, Any
from sqlalchemy import String, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.collection import Collection
    from app.models.api import Api
    from app.models.request_history import RequestHistory

class Request(Base):
    __tablename__ = "requests"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    # collection_id is nullable: requests can be tested directly without belonging to a collection
    collection_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("collections.id", ondelete="CASCADE"), nullable=True, index=True
    )
    
    # api_id is nullable: ad-hoc/external URLs can be tested without linking to an API in API Vault
    api_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("apis.id", ondelete="SET NULL"), nullable=True, index=True
    )

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    method: Mapped[str] = mapped_column(String(10), nullable=False, default="GET")
    url: Mapped[str] = mapped_column(String(1000), nullable=False)

    # Request configuration fields (stored as JSON)
    params: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True, default=dict)
    headers: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True, default=dict)
    auth: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True, default=dict)
    body: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    collection: Mapped[Optional["Collection"]] = relationship(
        "Collection", back_populates="requests"
    )
    api: Mapped[Optional["Api"]] = relationship(
        "Api", back_populates="requests"
    )
    history: Mapped[List["RequestHistory"]] = relationship(
        "RequestHistory", back_populates="request"
    )
