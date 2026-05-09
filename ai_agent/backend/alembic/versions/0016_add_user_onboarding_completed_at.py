"""add onboarding_completed_at to users

Revision ID: 0016_add_user_onboarding_completed_at
Revises: 0015_create_mv_usage_daily
Create Date: 2026-05-08T00:00:00+00:00

Adds:
  - users.onboarding_completed_at — nullable timestamptz; null means the user
    hasn't completed onboarding yet, set when they finish the wizard.
"""

import sqlalchemy as sa

from alembic import op

revision = "0016_add_user_onboarding_completed_at"
down_revision = "0015_create_mv_usage_daily"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "onboarding_completed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "onboarding_completed_at")
