from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.db.session import get_db
from app.models.meal_entry import MealEntry
from app.models.nutrition_goal import NutritionGoal
from app.models.user import User
from app.models.weight_entry import WeightEntry
from app.schemas.weekly_progress import WeeklyDayResponse, WeeklyProgressResponse

router = APIRouter(prefix="/progress", tags=["Progress"])
DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("/weekly", response_model=WeeklyProgressResponse)
def get_weekly_progress(
    current_user: CurrentUser,
    database: DatabaseSession,
    week_start: date = Query(),
) -> WeeklyProgressResponse:
    if week_start.weekday() != 0:
        raise HTTPException(status_code=422, detail="La semana debe comenzar un lunes.")

    week_end = week_start + timedelta(days=7)
    goal = database.scalar(select(NutritionGoal).where(NutritionGoal.user_id == current_user.id))
    if goal is None:
        raise HTTPException(status_code=404, detail="No hay un objetivo nutricional configurado.")

    meals = database.scalars(select(MealEntry).where(
        MealEntry.user_id == current_user.id,
        MealEntry.recorded_on >= week_start,
        MealEntry.recorded_on < week_end,
    )).all()
    weights = database.scalars(select(WeightEntry).where(
        WeightEntry.user_id == current_user.id,
        WeightEntry.recorded_on >= week_start,
        WeightEntry.recorded_on < week_end,
    ).order_by(WeightEntry.recorded_on)).all()

    meals_by_day: dict[date, list[MealEntry]] = {}
    for meal in meals:
        meals_by_day.setdefault(meal.recorded_on, []).append(meal)
    weights_by_day = {entry.recorded_on: float(entry.weight_kg) for entry in weights}

    days = []
    for offset in range(7):
        recorded_on = week_start + timedelta(days=offset)
        day_meals = meals_by_day.get(recorded_on, [])
        days.append(WeeklyDayResponse(
            recorded_on=recorded_on,
            has_registry=bool(day_meals),
            calories=sum(meal.calories for meal in day_meals),
            protein_grams=round(sum(float(meal.protein_grams) for meal in day_meals), 1),
            weight_kg=weights_by_day.get(recorded_on),
        ))

    registered_days = sum(day.has_registry for day in days)
    weight_change = (
        round(float(weights[-1].weight_kg - weights[0].weight_kg), 1)
        if len(weights) >= 2 else None
    )
    return WeeklyProgressResponse(
        week_start=week_start,
        days=days,
        days_with_registry=registered_days,
        avg_calories=round(sum(day.calories for day in days) / registered_days) if registered_days else 0,
        avg_protein=round(sum(day.protein_grams for day in days) / registered_days) if registered_days else 0,
        weight_change=weight_change,
        goal_calories=goal.daily_calories,
        goal_protein_grams=goal.protein_grams,
    )
