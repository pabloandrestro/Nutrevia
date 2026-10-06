from datetime import date

from pydantic import BaseModel


class WeeklyDayResponse(BaseModel):
    recorded_on: date
    has_registry: bool
    calories: int
    protein_grams: float
    weight_kg: float | None


class WeeklyProgressResponse(BaseModel):
    week_start: date
    days: list[WeeklyDayResponse]
    days_with_registry: int
    avg_calories: int
    avg_protein: int
    weight_change: float | None
    goal_calories: int
    goal_protein_grams: int
