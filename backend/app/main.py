from fastapi import FastAPI

from app.api.routes.auth import router as auth_router
from app.api.routes.barcode import router as barcode_router
from app.api.routes.health import router as health_router
from app.core.config import settings
from app.api.routes.profile import router as profile_router
from app.api.routes.food_images import router as food_images_router
from app.api.routes.nutrition_goal import router as nutrition_goal_router
from app.api.routes.weights import router as weights_router
from app.api.routes.meals import router as meals_router
from app.api.routes.wellbeing import router as wellbeing_router
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(nutrition_goal_router)
app.include_router(food_images_router)
app.include_router(weights_router)
app.include_router(barcode_router)
app.include_router(meals_router)
app.include_router(wellbeing_router)
