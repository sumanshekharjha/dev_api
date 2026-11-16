"""create mock API tables

Revision ID: 7c1b6b47e2d0
Revises: 088b77d2f218
Create Date: 2026-09-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7c1b6b47e2d0"
down_revision: Union[str, Sequence[str], None] = "088b77d2f218"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "mock_apis",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("token", sa.String(length=64), nullable=False),
        sa.Column("source_type", sa.String(length=50), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token"),
    )
    op.create_index(op.f("ix_mock_apis_id"), "mock_apis", ["id"], unique=False)
    op.create_index(op.f("ix_mock_apis_user_id"), "mock_apis", ["user_id"], unique=False)

    op.create_table(
        "mock_endpoints",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("mock_api_id", sa.Integer(), nullable=False),
        sa.Column("path", sa.String(length=1000), nullable=False),
        sa.Column("method", sa.String(length=10), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=False),
        sa.Column("request_body", sa.JSON(), nullable=True),
        sa.Column("response_body", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["mock_api_id"], ["mock_apis.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_mock_endpoints_id"), "mock_endpoints", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_mock_endpoints_mock_api_id"),
        "mock_endpoints",
        ["mock_api_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_mock_endpoints_mock_api_id"), table_name="mock_endpoints")
    op.drop_index(op.f("ix_mock_endpoints_id"), table_name="mock_endpoints")
    op.drop_table("mock_endpoints")
    op.drop_index(op.f("ix_mock_apis_user_id"), table_name="mock_apis")
    op.drop_index(op.f("ix_mock_apis_id"), table_name="mock_apis")
    op.drop_table("mock_apis")
