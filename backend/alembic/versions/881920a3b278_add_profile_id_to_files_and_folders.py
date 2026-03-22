"""Add profile_id to files and folders

Revision ID: 881920a3b278
Revises: 1c2575bc0d34
Create Date: 2026-03-21 17:02:15.844035

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column, select
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision: str = '881920a3b278'
down_revision: Union[str, Sequence[str], None] = '1c2575bc0d34'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    """Upgrade schema safely."""
    # Add profile_id columns as nullable first
    op.add_column('files', sa.Column('profile_id', postgresql.UUID(), nullable=True))
    op.add_column('folders', sa.Column('profile_id', postgresql.UUID(), nullable=True))

    conn = op.get_bind()

    # Ensure every user has at least one profile
    users_without_profiles = conn.execute(
        sa.text("""
            SELECT id FROM users
            WHERE id NOT IN (SELECT DISTINCT owner_id FROM profiles)
        """)
    ).fetchall()

    for (user_id,) in users_without_profiles:
        new_profile_id = str(uuid.uuid4())
        conn.execute(
            sa.text("""
                INSERT INTO profiles (id, name, owner_id, is_default)
                VALUES (:id, 'Default', :owner_id, TRUE)
            """),
            {"id": new_profile_id, "owner_id": user_id}
        )

    # Prepare table objects for backfill
    profile_tbl = table('profiles', column('id', postgresql.UUID()), column('owner_id', postgresql.UUID()))
    files_tbl = table('files', column('id', postgresql.UUID()), column('owner_id', postgresql.UUID()), column('profile_id', postgresql.UUID()))
    folders_tbl = table('folders', column('id', postgresql.UUID()), column('owner_id', postgresql.UUID()), column('profile_id', postgresql.UUID()))

    # Backfill files and folders with a profile
    owners = conn.execute(sa.text("SELECT DISTINCT owner_id FROM files")).fetchall()
    for (owner_id,) in owners:
        profile_id = conn.execute(
            select(profile_tbl.c.id).where(profile_tbl.c.owner_id == owner_id).limit(1)
        ).scalar()
        if profile_id:
            conn.execute(
                files_tbl.update().where(files_tbl.c.owner_id == owner_id).values(profile_id=profile_id)
            )
            conn.execute(
                folders_tbl.update().where(folders_tbl.c.owner_id == owner_id).values(profile_id=profile_id)
            )

    # Alter columns to be non-nullable
    op.alter_column('files', 'profile_id', nullable=False)
    op.alter_column('folders', 'profile_id', nullable=False)

    # Update unique constraints
    op.drop_constraint(op.f('uq_file_name_per_folder'), 'files', type_='unique')
    op.create_unique_constraint(
        'uq_file_name_per_folder', 'files', ['owner_id', 'profile_id', 'folder_id', 'name']
    )
    op.drop_constraint(op.f('uq_folder_name_per_location'), 'folders', type_='unique')
    op.create_unique_constraint(
        'uq_folder_name_per_location', 'folders', ['owner_id', 'profile_id', 'parent_id', 'name']
    )

    # Add foreign keys
    op.create_foreign_key(None, 'files', 'profiles', ['profile_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key(None, 'folders', 'profiles', ['profile_id'], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(None, 'folders', type_='foreignkey')
    op.drop_constraint('uq_folder_name_per_location', 'folders', type_='unique')
    op.create_unique_constraint(
        op.f('uq_folder_name_per_location'), 'folders', ['owner_id', 'parent_id', 'name'], postgresql_nulls_not_distinct=False
    )
    op.drop_column('folders', 'profile_id')

    op.drop_constraint(None, 'files', type_='foreignkey')
    op.drop_constraint('uq_file_name_per_folder', 'files', type_='unique')
    op.create_unique_constraint(
        op.f('uq_file_name_per_folder'), 'files', ['owner_id', 'folder_id', 'name'], postgresql_nulls_not_distinct=False
    )
    op.drop_column('files', 'profile_id')