from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import FloorPlanViewSet, FolderViewSet

router = DefaultRouter()
router.register("folders", FolderViewSet, basename="folder")
router.register("floor-plans", FloorPlanViewSet, basename="floor-plan")

# Nested route: /api/folders/<folder_id>/floor-plans/
folder_floor_plans = FloorPlanViewSet.as_view({"get": "list", "post": "create"})

urlpatterns = [
    path(
        "folders/<int:folder_id>/floor-plans/",
        folder_floor_plans,
        name="folder-floor-plans",
    ),
    path("", include(router.urls)),
]
