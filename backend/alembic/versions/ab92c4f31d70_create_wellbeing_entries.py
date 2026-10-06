"""create wellbeing entries

Revision ID: ab92c4f31d70
Revises: 9b8e2c3d4f50
"""

from alembic import op
import sqlalchemy as sa


revision = "ab92c4f31d70"
down_revision = "9b8e2c3d4f50"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "wellbeing_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("recorded_on", sa.Date(), nullable=False),
        sa.Column("sleep_hours", sa.Numeric(4, 2), nullable=True),
        sa.Column("stress_level", sa.SmallInteger(), nullable=True),
        sa.Column("fatigue_level", sa.SmallInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("user_id", "recorded_on", name="uq_wellbeing_entries_user_day"),
    )
    op.create_index("ix_wellbeing_entries_user_id", "wellbeing_entries", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_wellbeing_entries_user_id", table_name="wellbeing_entries")
    op.drop_table("wellbeing_entries")
