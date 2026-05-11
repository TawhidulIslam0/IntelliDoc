"""add soft delete to files and folders

Revision ID: 8e2f4a1b0c9d
Revises: 9a7cae16f10e
Create Date: 2026-05-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8e2f4a1b0c9d'
down_revision: Union[str, Sequence[str], None] = '9a7cae16f10e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Delete columns to files table.
    # server_default sets is_deleted to false to existing rows.
    op.add_column('files', sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('files', sa.Column('deleted_at', sa.String(length=50), nullable=True))

    # Same as above but for folders.
    op.add_column('folders', sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('folders', sa.Column('deleted_at', sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column('folders', 'deleted_at')
    op.drop_column('folders', 'is_deleted')
    op.drop_column('files', 'deleted_at')
    op.drop_column('files', 'is_deleted')
