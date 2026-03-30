from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import PhotoLinkViewSet, PhotoViewSet

router = DefaultRouter()
router.register("photos", PhotoViewSet, basename="photo")
router.register("photo-links", PhotoLinkViewSet, basename="photo-link")

# Nested route: /api/folders/<folder_id>/photos/
folder_photos = PhotoViewSet.as_view(
    {"get": "list", "post": "create"}
)
folder_photos_viewer = PhotoViewSet.as_view(
    {"get": "viewer"}
)
folder_photos_map = PhotoViewSet.as_view(
    {"get": "map_points"}
)

urlpatterns = [
    path("folders/<int:folder_id>/photos/", folder_photos, name="folder-photos"),
    path(
        "folders/<int:folder_id>/photos/viewer/",
        folder_photos_viewer,
        name="folder-photos-viewer",
    ),
    path(
        "folders/<int:folder_id>/photos/map_points/",
        folder_photos_map,
        name="folder-photos-map",
    ),
    path("", include(router.urls)),
]
