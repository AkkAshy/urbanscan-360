from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import FolderViewSet

router = DefaultRouter()
router.register("folders", FolderViewSet, basename="folder")

urlpatterns = [
    path("", include(router.urls)),
]
