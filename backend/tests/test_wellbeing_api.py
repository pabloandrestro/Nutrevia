import os
import unittest

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
from app.models.user import User


class WellbeingApiTests(unittest.TestCase):
    def test_entries_are_validated_saved_per_user_and_upserted_per_day(self):
        engine = create_engine(
            "sqlite+pysqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(engine)
        session_factory = sessionmaker(bind=engine)
        with session_factory() as db:
            db.add_all([
                User(id=1, email="a@example.invalid", is_active=True),
                User(id=2, email="b@example.invalid", is_active=True),
            ])
            db.commit()

        active_user = 1

        def database_override():
            with session_factory() as db:
                yield db

        def user_override():
            with session_factory() as db:
                return db.get(User, active_user)

        app.dependency_overrides[get_db] = database_override
        app.dependency_overrides[get_current_user] = user_override
        try:
            with TestClient(app) as client:
                invalid = client.post("/wellbeing", json={"recorded_on": "2026-10-06"})
                self.assertEqual(invalid.status_code, 422)
                self.assertEqual(client.post("/wellbeing", json={
                    "recorded_on": "2026-10-06", "sleep_hours": 25,
                }).status_code, 422)

                saved = client.post("/wellbeing", json={
                    "recorded_on": "2026-10-06", "sleep_hours": 7.5,
                    "stress_level": 2, "fatigue_level": 3,
                })
                self.assertEqual(saved.status_code, 200, saved.text)
                entry_id = saved.json()["id"]
                self.assertEqual(client.get("/wellbeing").json()[0]["sleep_hours"], 7.5)

                updated = client.post("/wellbeing", json={
                    "recorded_on": "2026-10-06", "stress_level": 4,
                })
                self.assertEqual(updated.status_code, 200, updated.text)
                self.assertEqual(updated.json()["id"], entry_id)
                self.assertIsNone(updated.json()["sleep_hours"])
                self.assertEqual(len(client.get("/wellbeing").json()), 1)

                active_user = 2
                self.assertEqual(client.get("/wellbeing").json(), [])
                self.assertEqual(client.delete(f"/wellbeing/{entry_id}").status_code, 404)
                own = client.post("/wellbeing", json={
                    "recorded_on": "2026-10-06", "fatigue_level": 1,
                })
                self.assertEqual(own.status_code, 200, own.text)

                active_user = 1
                self.assertEqual(len(client.get("/wellbeing").json()), 1)
                self.assertEqual(client.delete(f"/wellbeing/{entry_id}").status_code, 204)
                self.assertEqual(client.get("/wellbeing").json(), [])
        finally:
            app.dependency_overrides.clear()
            engine.dispose()


if __name__ == "__main__":
    unittest.main()
