from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsManagerOrAdmin

from .models import Photo
from .serializers import PhotoSerializer, PhotoViewerSerializer


class PhotoViewSet(viewsets.ModelViewSet):
    """CRUD фотографий внутри папки"""

    serializer_class = PhotoSerializer
    parser_classes = [MultiPartParser, FormParser]

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
        if self.action in ("list", "retrieve", "viewer"):
            return [IsAuthenticated()]
        if self.action == "create":
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
        """GET /api/folders/{id}/photos/viewer/ — оптимизированный список для вьювера"""
        qs = self.get_queryset()
        serializer = PhotoViewerSerializer(qs, many=True)
        return Response(serializer.data)
