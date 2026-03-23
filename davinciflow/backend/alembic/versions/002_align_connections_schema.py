"""Align connections table to current model."""
from __future__ import annotations
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "002_align_connections_schema"
down_revision = "001_initial_schema"
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Rename conn_type -> type
    op.alter_column("connections", "conn_type", new_column_name="type")
    # Rename config_json -> config
    op.alter_column("connections", "config_json", new_column_name="config")
    # Add description column (nullable)
    op.add_column("connections", sa.Column("description", sa.Text(), nullable=True))
    # Drop secret_ref (not in current model)
    op.drop_column("connections", "secret_ref")

def downgrade() -> None:
    op.alter_column("connections", "type", new_column_name="conn_type")
    op.alter_column("connections", "config", new_column_name="config_json")
    op.drop_column("connections", "description")
    op.add_column("connections", sa.Column("secret_ref", sa.String(), nullable=True))
