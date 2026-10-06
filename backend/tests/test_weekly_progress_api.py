import os
import unittest
from datetime import date

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite://")
os.environ.setdefault("JWT_SECRET_KEY", "isolated-test-key")
os.environ.setdefault("GOOGLE_CLIENT_ID", "isolated-test-client")

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.api.dependencies.auth import get_current_user
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.meal_entry import MealEntry
from app.models.nutrition_goal import NutritionGoal
from app.models.user import User
from app.models.weight_entry import WeightEntry


class WeeklyProgressApiTests(unittest.TestCase):
    def test_weekly_summary_uses_persisted_meals_weights_and_current_user(self):
        engine = create_engine("sqlite+pysqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(engine)
        sessions = sessionmaker(bind=engine)
        with sessions() as db:
            db.add_all([
                User(id=1, email="a@example.invalid", is_active=True),
                User(id=2, email="b@example.invalid", is_active=True),
                NutritionGoal(user_id=1, goal_type="maintain", daily_calories=2000, protein_grams=100, carbohydrate_grams=250, fat_grams=60),
                NutritionGoal(user_id=2, goal_type="maintain", daily_calories=1500, protein_grams=80, carbohydrate_grams=190, fat_grams=50),
                MealEntry(user_id=1, recorded_on=date(2026, 10, 5), meal_type="almuerzo", source="manual", description="A", calories=400, protein_grams=20, carb_grams=30, fat_grams=10),
                MealEntry(user_id=1, recorded_on=date(2026, 10, 5), meal_type="cena", source="manual", description="B", calories=600, protein_grams=30, carb_grams=40, fat_grams=20),
                MealEntry(user_id=1, recorded_on=date(2026, 10, 6), meal_type="almuerzo", source="manual", description="C", calories=500, protein_grams=40, carb_grams=50, fat_grams=10),
                MealEntry(user_id=1, recorded_on=date(2026, 10, 12), meal_type="almuerzo", source="manual", description="Next week", calories=900, protein_grams=10, carb_grams=10, fat_grams=10),
                MealEntry(user_id=2, recorded_on=date(2026, 10, 5), meal_type="almuerzo", source="manual", description="Other user", calories=3000, protein_grams=99, carb_grams=99, fat_grams=99),
                WeightEntry(user_id=1, recorded_on=date(2026, 10, 5), weight_kg=78),
                WeightEntry(user_id=1, recorded_on=date(2026, 10, 6), weight_kg=77.5),
                WeightEntry(user_id=2, recorded_on=date(2026, 10, 5), weight_kg=90),
            ])
            db.commit()

        active_user = 1

        def database_override():
            with sessions() as db:
                yield db

        def user_override():
            with sessions() as db:
                return db.get(User, active_user)

        app.dependency_overrides[get_db] = database_override
        app.dependency_overrides[get_current_user] = user_override
        try:
            with TestClient(app) as client:
                response = client.get("/progress/weekly?week_start=2026-10-05")
                self.assertEqual(response.status_code, 200, response.text)
                result = response.json()
                self.assertEqual(len(result["days"]), 7)
                self.assertEqual(result["days_with_registry"], 2)
                self.assertEqual([day["calories"] for day in result["days"][:3]], [1000, 500, 0])
                self.assertEqual(result["avg_calories"], 750)
                self.assertEqual(result["avg_protein"], 45)
                self.assertEqual(result["weight_change"], -0.5)
                self.assertEqual(result["goal_calories"], 2000)
                self.assertEqual(client.get("/progress/weekly?week_start=2026-10-06").status_code, 422)

                active_user = 2
                other = client.get("/progress/weekly?week_start=2026-10-05").json()
                self.assertEqual(other["days_with_registry"], 1)
                self.assertEqual(other["avg_calories"], 3000)
                self.assertIsNone(other["weight_change"])
        finally:
            app.dependency_overrides.clear()
            engine.dispose()
