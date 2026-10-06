from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, SmallInteger, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class WellbeingEntry(Base):
    __tablename__ = "wellbeing_entries"
    __table_args__ = (
        UniqueConstraint("user_id", "recorded_on", name="uq_wellbeing_entries_user_day"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False,
    )
    recorded_on: Mapped[date] = mapped_column(Date, nullable=False)
    sleep_hours: Mapped[Decimal | None] = mapped_column(Numeric(4, 2), nullable=True)
    stress_level: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    fatigue_level: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
