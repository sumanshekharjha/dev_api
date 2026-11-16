from typing import TYPE_CHECKING, List
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.api import Api
    from app.models.collection import Collection
    from app.models.mock_api import MockApi
    from app.models.request_history import RequestHistory

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))

    # Relationships
    apis: Mapped[List["Api"]] = relationship(
        "Api", back_populates="user", cascade="all, delete-orphan"
    )
    collections: Mapped[List["Collection"]] = relationship(
        "Collection", back_populates="user", cascade="all, delete-orphan"
    )
    request_history: Mapped[List["RequestHistory"]] = relationship(
        "RequestHistory", back_populates="user", cascade="all, delete-orphan"
    )
    mock_apis: Mapped[List["MockApi"]] = relationship(
        "MockApi", back_populates="user", cascade="all, delete-orphan"
    )
