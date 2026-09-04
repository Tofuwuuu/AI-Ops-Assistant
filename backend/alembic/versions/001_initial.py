"""Initial schema: tickets, drafts, agent_logs, kb_docs."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    ticket_status = postgresql.ENUM(
        "pending",
        "classified",
        "drafted",
        "needs_review",
        "approved",
        "rejected",
        "failed",
        name="ticket_status",
        create_type=False,
    )
    ticket_category = postgresql.ENUM(
        "bug",
        "billing",
        "how-to",
        "feature",
        "unknown",
        name="ticket_category",
        create_type=False,
    )
    agent_step = postgresql.ENUM(
        "ingest",
        "classify",
        "retrieve",
        "reason",
        "generate",
        "validate",
        "persist",
        "handoff",
        name="agent_step",
        create_type=False,
    )

    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE ticket_status AS ENUM (
                'pending', 'classified', 'drafted', 'needs_review',
                'approved', 'rejected', 'failed'
            );
        EXCEPTION WHEN duplicate_object THEN null; END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE ticket_category AS ENUM (
                'bug', 'billing', 'how-to', 'feature', 'unknown'
            );
        EXCEPTION WHEN duplicate_object THEN null; END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE agent_step AS ENUM (
                'ingest', 'classify', 'retrieve', 'reason',
                'generate', 'validate', 'persist', 'handoff'
            );
        EXCEPTION WHEN duplicate_object THEN null; END $$;
        """
    )

    op.create_table(
        "tickets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("subject", sa.String(255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("requester_email", sa.String(255), nullable=False),
        sa.Column("category", ticket_category, nullable=True),
        sa.Column("status", ticket_status, nullable=False, server_default="pending"),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("reason_decision", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "drafts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("ticket_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="0"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "agent_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("ticket_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("step", agent_step, nullable=False),
        sa.Column("input_json", postgresql.JSONB(), nullable=True),
        sa.Column("output_json", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "kb_docs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("tags", sa.String(512), nullable=True),
        sa.Column("search_vector", postgresql.TSVECTOR(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_kb_docs_search_vector
        ON kb_docs USING GIN (search_vector);
        """
    )
    op.create_index("ix_tickets_status", "tickets", ["status"])
    op.create_index("ix_agent_logs_ticket_id", "agent_logs", ["ticket_id"])


def downgrade() -> None:
    op.drop_index("ix_agent_logs_ticket_id", table_name="agent_logs")
    op.drop_index("ix_tickets_status", table_name="tickets")
    op.execute("DROP INDEX IF EXISTS ix_kb_docs_search_vector")
    op.drop_table("kb_docs")
    op.drop_table("agent_logs")
    op.drop_table("drafts")
    op.drop_table("tickets")
    op.execute("DROP TYPE IF EXISTS agent_step")
    op.execute("DROP TYPE IF EXISTS ticket_category")
    op.execute("DROP TYPE IF EXISTS ticket_status")
