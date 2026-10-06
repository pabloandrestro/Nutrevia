from datetime import date

from pydantic import BaseModel, ConfigDict, Field, model_validator


class WellbeingEntryCreate(BaseModel):
    recorded_on: date
    sleep_hours: float | None = Field(default=None, ge=0, le=24)
    stress_level: int | None = Field(default=None, ge=1, le=5)
    fatigue_level: int | None = Field(default=None, ge=1, le=5)

    @model_validator(mode="after")
    def require_measurement(self):
        if all(value is None for value in (
            self.sleep_hours, self.stress_level, self.fatigue_level,
        )):
            raise ValueError("Debes registrar al menos un dato de bienestar.")
        return self


class WellbeingEntryResponse(BaseModel):
    id: int
    recorded_on: date
    sleep_hours: float | None
    stress_level: int | None
    fatigue_level: int | None

    model_config = ConfigDict(from_attributes=True)
