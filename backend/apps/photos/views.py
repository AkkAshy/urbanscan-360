from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsManagerOrAdmin

from .models import Photo, PhotoLink
from .serializers import PhotoLinkSerializer, PhotoSerializer, PhotoViewerSerializer
from .utils import calculate_bearing, haversine


class PhotoViewSet(viewsets.ModelViewSet):
    """CRUD фотографий внутри папки"""

    serializer_class = PhotoSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = Photo.objects.select_related("uploaded_by")
        # Фильтр по папке если указан в URL
        folder_id = self.kwargs.get("folder_id") or self.request.query_params.get(
            "folder"
        )
        if folder_id:
            qs = qs.filter(folder_id=folder_id)

        # Лимит количества результатов (для превью на главной)
        limit = self.request.query_params.get("limit")
        if limit and limit.isdigit():
            qs = qs[: int(limit)]

        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve", "viewer", "neighbors", "map_points", "links"):
            return [IsAuthenticated()]
        if self.action in ("create", "create_link"):
            return [IsAuthenticated()]
        return [IsManagerOrAdmin()]  # update, delete

    def perform_create(self, serializer):
        folder_id = self.kwargs.get("folder_id")
        serializer.save(
            uploaded_by=self.request.user,
            folder_id=folder_id,
        )

    def create(self, request, *args, **kwargs):
        """Поддержка загрузки нескольких файлов за раз"""
        files = request.FILES.getlist("image")

        # Один файл — стандартное поведение
        if len(files) <= 1:
            return super().create(request, *args, **kwargs)

        # Несколько файлов — batch upload
        created = []
        for f in files:
            data = request.data.copy()
            data["image"] = f
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            created.append(serializer.data)

        return Response(created, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def viewer(self, request, **kwargs):
        """GET /api/folders/{id}/photos/viewer/ — список для вьювера"""
        qs = self.get_queryset()
        serializer = PhotoViewerSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def neighbors(self, request, pk=None, **kwargs):
        """GET /api/photos/{id}/neighbors/ — ближайшие фото по GPS"""
        photo = self.get_object()
        if not photo.latitude or not photo.longitude:
            return Response([])

        max_distance = float(request.query_params.get("max_distance", 100))
        limit = int(request.query_params.get("limit", 4))

        # Все фото с GPS в той же папке (кроме текущего)
        candidates = Photo.objects.filter(
            folder=photo.folder,
            latitude__isnull=False,
        ).exclude(pk=photo.pk)

        # Считаем расстояние и азимут
        neighbors = []
        for c in candidates:
            dist = haversine(photo.latitude, photo.longitude, c.latitude, c.longitude)
            if dist <= max_distance:
                bearing = calculate_bearing(
                    photo.latitude, photo.longitude, c.latitude, c.longitude
                )
                thumb_url = None
                if c.thumbnail:
                    thumb_url = request.build_absolute_uri(c.thumbnail.url)
                neighbors.append({
                    "id": c.id,
                    "title": c.title,
                    "thumbnail": thumb_url,
                    "distance": round(dist, 1),
                    "bearing": round(bearing, 1),
                })

        neighbors.sort(key=lambda x: x["distance"])
        return Response(neighbors[:limit])

    @action(detail=False, methods=["get"])
    def map_points(self, request, **kwargs):
        """GET /api/folders/{id}/photos/map_points/ — все фото с GPS для карты"""
        qs = self.get_queryset().filter(latitude__isnull=False)
        data = []
        for photo in qs:
            thumb_url = None
            if photo.thumbnail:
                thumb_url = request.build_absolute_uri(photo.thumbnail.url)
            data.append({
                "id": photo.id,
                "title": photo.title,
                "thumbnail": thumb_url,
                "latitude": photo.latitude,
                "longitude": photo.longitude,
            })
        return Response(data)

    @action(detail=True, methods=["get"])
    def links(self, request, pk=None, **kwargs):
        """GET /api/photos/{id}/links/ — все связи ИЗ этого фото"""
        photo = self.get_object()
        qs = PhotoLink.objects.filter(from_photo=photo).select_related("to_photo")
        serializer = PhotoLinkSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="links/create")
    def create_link(self, request, pk=None, **kwargs):
        """POST /api/photos/{id}/links/create/ — создать связь"""
        photo = self.get_object()
        data = request.data.copy()
        data["from_photo"] = photo.pk
        serializer = PhotoLinkSerializer(data=data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PhotoLinkViewSet(viewsets.GenericViewSet):
    """Удаление связей фото"""

    serializer_class = PhotoLinkSerializer
    queryset = PhotoLink.objects.all()

    def get_permissions(self):
        return [IsAuthenticated()]

    def destroy(self, request, pk=None):
        """DELETE /api/photo-links/{id}/"""
        link = self.get_object()
        link.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
