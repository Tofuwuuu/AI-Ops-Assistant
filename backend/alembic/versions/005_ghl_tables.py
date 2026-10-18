"""Create the accounts, auth, CRM, calendar, campaigns, payments, and funnels tables.

004_ghl_expansion was a no-op: those tables only ever came from
Base.metadata.create_all at startup, so a database built by Alembic alone
stopped at the original six tables. This revision creates them.

Additive and idempotent: each table, column, index, and foreign key is created
only when it is missing, so a database that create_all already filled passes
through unchanged. Nothing is dropped or altered.

Revision ID: 005_ghl_tables
Revises: 004_ghl_expansion
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "005_ghl_tables"
down_revision: Union[str, None] = "004_ghl_expansion"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _insp():
    return sa.inspect(op.get_bind())


def _create_table(name, *columns, **kw):
    if not _insp().has_table(name):
        op.create_table(name, *columns, **kw)


def _create_index(name, table, columns, unique=False, **kw):
    if name not in {ix["name"] for ix in _insp().get_indexes(table)}:
        op.create_index(name, table, columns, unique=unique, **kw)


def _add_column(table, column):
    if column.name not in {c["name"] for c in _insp().get_columns(table)}:
        op.add_column(table, column)


def _create_fk(name, source, referent, local_cols, remote_cols, **kw):
    existing = _insp().get_foreign_keys(source)
    if any(fk["name"] == name or fk["constrained_columns"] == local_cols for fk in existing):
        return
    op.create_foreign_key(name, source, referent, local_cols, remote_cols, **kw)


def upgrade() -> None:
    _create_table('accounts',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('slug', sa.String(length=100), nullable=False),
    sa.Column('type', sa.Enum('agency', 'sub_account', name='account_type'), nullable=False),
    sa.Column('parent_account_id', sa.UUID(), nullable=True),
    sa.Column('branding_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('custom_domain', sa.String(length=255), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['parent_account_id'], ['accounts.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    _create_index(op.f('ix_accounts_slug'), 'accounts', ['slug'], unique=True)
    _create_table('users',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('hashed_password', sa.String(length=255), nullable=False),
    sa.Column('display_name', sa.String(length=255), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    _create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    _create_table('account_members',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('account_id', sa.UUID(), nullable=False),
    sa.Column('role', sa.Enum('owner', 'admin', 'member', name='member_role'), nullable=False),
    sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'account_id', name='uq_user_account')
    )
    _create_table('calendar_slot_rules',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('account_id', sa.UUID(), nullable=False),
    sa.Column('weekday', sa.Integer(), nullable=False),
    sa.Column('start_time', sa.Time(), nullable=False),
    sa.Column('end_time', sa.Time(), nullable=False),
    sa.Column('duration_minutes', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    _create_index(op.f('ix_calendar_slot_rules_account_id'), 'calendar_slot_rules', ['account_id'], unique=False)
    _create_table('campaigns',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('account_id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('channel', sa.Enum('email', 'sms', name='campaign_channel'), nullable=False),
    sa.Column('subject', sa.String(length=255), nullable=True),
    sa.Column('body_template', sa.Text(), nullable=False),
    sa.Column('status', sa.Enum('draft', 'sending', 'sent', 'failed', name='campaign_status'), nullable=False),
    sa.Column('audience_filter', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    _create_index(op.f('ix_campaigns_account_id'), 'campaigns', ['account_id'], unique=False)
    _create_table('companies',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('account_id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('domain', sa.String(length=255), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    _create_index(op.f('ix_companies_account_id'), 'companies', ['account_id'], unique=False)
    _create_table('funnel_pages',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('account_id', sa.UUID(), nullable=False),
    sa.Column('slug', sa.String(length=100), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('blocks_json', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('published', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('account_id', 'slug', name='uq_funnel_account_slug')
    )
    _create_index(op.f('ix_funnel_pages_account_id'), 'funnel_pages', ['account_id'], unique=False)
    _create_table('pipelines',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('account_id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('stages', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    _create_index(op.f('ix_pipelines_account_id'), 'pipelines', ['account_id'], unique=False)
    _create_table('contacts',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('account_id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=True),
    sa.Column('phone', sa.String(length=64), nullable=True),
    sa.Column('company_id', sa.UUID(), nullable=True),
    sa.Column('tags', sa.String(length=512), nullable=True),
    sa.Column('custom_fields', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    _create_index(op.f('ix_contacts_account_id'), 'contacts', ['account_id'], unique=False)
    _create_index(op.f('ix_contacts_email'), 'contacts', ['email'], unique=False)
    _create_table('appointments',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('account_id', sa.UUID(), nullable=False),
    sa.Column('contact_id', sa.UUID(), nullable=True),
    sa.Column('starts_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('ends_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('status', sa.Enum('booked', 'cancelled', 'completed', name='appointment_status'), nullable=False),
    sa.Column('meeting_link', sa.String(length=512), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('guest_name', sa.String(length=255), nullable=True),
    sa.Column('guest_email', sa.String(length=255), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    _create_index(op.f('ix_appointments_account_id'), 'appointments', ['account_id'], unique=False)
    _create_table('campaign_recipients',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('campaign_id', sa.UUID(), nullable=False),
    sa.Column('contact_id', sa.UUID(), nullable=False),
    sa.Column('status', sa.Enum('pending', 'sent', 'failed', name='recipient_status'), nullable=False),
    sa.Column('provider_message_id', sa.String(length=255), nullable=True),
    sa.Column('error', sa.Text(), nullable=True),
    sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    _create_index(op.f('ix_campaign_recipients_campaign_id'), 'campaign_recipients', ['campaign_id'], unique=False)
    _create_table('deals',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('account_id', sa.UUID(), nullable=False),
    sa.Column('contact_id', sa.UUID(), nullable=True),
    sa.Column('pipeline_id', sa.UUID(), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('stage', sa.String(length=100), nullable=False),
    sa.Column('value', sa.Float(), nullable=False),
    sa.Column('status', sa.Enum('open', 'won', 'lost', name='deal_status'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['pipeline_id'], ['pipelines.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    _create_index(op.f('ix_deals_account_id'), 'deals', ['account_id'], unique=False)
    _create_table('funnel_submissions',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('funnel_page_id', sa.UUID(), nullable=False),
    sa.Column('contact_id', sa.UUID(), nullable=True),
    sa.Column('payload_json', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['funnel_page_id'], ['funnel_pages.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    _create_index(op.f('ix_funnel_submissions_funnel_page_id'), 'funnel_submissions', ['funnel_page_id'], unique=False)
    _create_table('invoices',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('account_id', sa.UUID(), nullable=False),
    sa.Column('contact_id', sa.UUID(), nullable=True),
    sa.Column('deal_id', sa.UUID(), nullable=True),
    sa.Column('amount', sa.Float(), nullable=False),
    sa.Column('currency', sa.String(length=8), nullable=False),
    sa.Column('status', sa.Enum('draft', 'open', 'paid', 'void', name='invoice_status'), nullable=False),
    sa.Column('stripe_checkout_session_id', sa.String(length=255), nullable=True),
    sa.Column('stripe_payment_intent_id', sa.String(length=255), nullable=True),
    sa.Column('due_date', sa.Date(), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['deal_id'], ['deals.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    _create_index(op.f('ix_invoices_account_id'), 'invoices', ['account_id'], unique=False)
    _create_table('invoice_line_items',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('invoice_id', sa.UUID(), nullable=False),
    sa.Column('description', sa.String(length=255), nullable=False),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('unit_amount', sa.Float(), nullable=False),
    sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    _add_column('app_settings', sa.Column('account_id', sa.UUID(), nullable=True))
    _create_index(op.f('ix_app_settings_account_id'), 'app_settings', ['account_id'], unique=True)
    _create_fk('app_settings_account_id_fkey', 'app_settings', 'accounts', ['account_id'], ['id'], ondelete='CASCADE')
    _add_column('kb_docs', sa.Column('account_id', sa.UUID(), nullable=True))
    _create_index(op.f('ix_kb_docs_account_id'), 'kb_docs', ['account_id'], unique=False)
    _create_fk('kb_docs_account_id_fkey', 'kb_docs', 'accounts', ['account_id'], ['id'], ondelete='CASCADE')
    _add_column('tickets', sa.Column('account_id', sa.UUID(), nullable=True))
    _add_column('tickets', sa.Column('contact_id', sa.UUID(), nullable=True))
    _create_index(op.f('ix_tickets_account_id'), 'tickets', ['account_id'], unique=False)
    _create_fk('tickets_account_id_fkey', 'tickets', 'accounts', ['account_id'], ['id'], ondelete='CASCADE')
    _create_fk('tickets_contact_id_fkey', 'tickets', 'contacts', ['contact_id'], ['id'], ondelete='SET NULL')



def downgrade() -> None:
    # Not reversible without data loss. Drop the tables by hand if you need to.
    raise NotImplementedError("005_ghl_tables does not downgrade")
