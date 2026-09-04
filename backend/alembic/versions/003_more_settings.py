"""Add sentiment/tier threshold columns to app_settings."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003_more_settings"
down_revision: Union[str, None] = "002_app_settings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "app_settings",
        sa.Column(
            "sentiment_priority_threshold", sa.Float(), nullable=False, server_default="0.5"
        ),
    )
    op.add_column(
        "app_settings",
        sa.Column(
            "tier_ticket_share_threshold", sa.Float(), nullable=False, server_default="0.2"
        ),
    )


def downgrade() -> None:
    op.drop_column("app_settings", "tier_ticket_share_threshold")
    op.drop_column("app_settings", "sentiment_priority_threshold")
