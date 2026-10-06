from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.wellbeing_entry import WellbeingEntry
from app.schemas.wellbeing_entry import WellbeingEntryCreate, WellbeingEntryResponse


router = APIRouter(prefix="/wellbeing", tags=["Wellbeing"])
DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("", response_model=list[WellbeingEntryResponse])
def get_wellbeing_entries(
    current_user: CurrentUser,
    database: DatabaseSession,
) -> list[WellbeingEntry]:
    return list(database.scalars(
        select(WellbeingEntry)
        .where(WellbeingEntry.user_id == current_user.id)
        .order_by(WellbeingEntry.recorded_on, WellbeingEntry.id)
    ))


@router.post("", response_model=WellbeingEntryResponse)
def save_wellbeing_entry(
    data: WellbeingEntryCreate,
    current_user: CurrentUser,
    database: DatabaseSession,
) -> WellbeingEntry:
    entry = database.scalar(select(WellbeingEntry).where(
        WellbeingEntry.user_id == current_user.id,
        WellbeingEntry.recorded_on == data.recorded_on,
    ))
    if entry is None:
        entry = WellbeingEntry(user_id=current_user.id, recorded_on=data.recorded_on)
        database.add(entry)

    entry.sleep_hours = data.sleep_hours
    entry.stress_level = data.stress_level
    entry.fatigue_level = data.fatigue_level
    database.commit()
    database.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_wellbeing_entry(
    entry_id: int,
    current_user: CurrentUser,
    database: DatabaseSession,
) -> None:
    entry = database.scalar(select(WellbeingEntry).where(
        WellbeingEntry.id == entry_id,
        WellbeingEntry.user_id == current_user.id,
    ))
    if entry is None:
        raise HTTPException(status_code=404, detail="Registro de bienestar no encontrado.")
    database.delete(entry)
    database.commit()
