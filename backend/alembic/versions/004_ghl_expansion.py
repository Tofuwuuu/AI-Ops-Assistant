"""Accounts, auth, CRM, calendar, campaigns, payments, funnels tables."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "004_ghl_expansion"
down_revision: Union[str, None] = "003_more_settings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # create_all on startup handles most of this; migration documents intent.
    # Extra ALTERs for live DBs are applied in app.main._ensure_columns.
    pass


def downgrade() -> None:
    pass
