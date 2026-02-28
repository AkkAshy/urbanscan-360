from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import PhotoViewSet

router = DefaultRouter()
router.register("photos", PhotoViewSet, basename="photo")

# Nested route: /api/folders/<folder_id>/photos/
folder_photos = PhotoViewSet.as_view(
    {"get": "list", "post": "create"}
)
folder_photos_viewer = PhotoViewSet.as_view(
    {"get": "viewer"}
)

urlpatterns = [
    path("folders/<int:folder_id>/photos/", folder_photos, name="folder-photos"),
    path(
        "folders/<int:folder_id>/photos/viewer/",
        folder_photos_viewer,
        name="folder-photos-viewer",
    ),
    path("", include(router.urls)),
]
