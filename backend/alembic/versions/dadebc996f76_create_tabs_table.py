"""create_tabs_table

Revision ID: dadebc996f76
Revises: 881920a3b278
Create Date: 2026-04-11 18:26:40.682660

"""
from alembic import op
import sqlalchemy as sa

revision = 'dadebc996f76'
down_revision = '881920a3b278'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Create the tabs table
    op.create_table(
        'tabs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('file_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('created_at', sa.String(length=50), nullable=True),
        sa.Column('updated_at', sa.String(length=50), nullable=True),
        
        sa.ForeignKeyConstraint(['file_id'], ['files.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        
        sa.UniqueConstraint('file_id', 'name', name='uq_tab_name_per_file')
    )

def downgrade() -> None:
    op.drop_table('tabs')