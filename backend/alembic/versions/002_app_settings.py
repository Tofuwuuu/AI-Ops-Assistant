"""Add app_settings singleton table."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_app_settings"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "app_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("notify_email", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("notify_slack", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("require_human_review", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("ask_clarifying_threshold", sa.Float(), nullable=False, server_default="0.45"),
        sa.Column("bug_escalate_threshold", sa.Float(), nullable=False, server_default="0.7"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("app_settings")
