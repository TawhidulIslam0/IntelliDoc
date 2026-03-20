"""add is_default to profiles

Revision ID: 1c2575bc0d34
Revises: c507bbae43bf
Create Date: 2026-03-19 18:45:14.245538

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1c2575bc0d34'
down_revision: str = 'c507bbae43bf'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add 'is_default' column with default False
    op.add_column(
        'profiles',
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default=sa.false())
    )
    # Remove server default so future inserts rely on model default
    op.alter_column('profiles', 'is_default', server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('profiles', 'is_default')