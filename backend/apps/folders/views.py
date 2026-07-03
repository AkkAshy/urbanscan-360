from django.db.models import Count
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsManagerOrAdmin

from .models import FloorPlan, Folder
from .serializers import FloorPlanSerializer, FolderSerializer


class FolderViewSet(viewsets.ModelViewSet):
    serializer_class = FolderSerializer

    def get_queryset(self):
        return (
            Folder.objects.annotate(photo_count=Count("photos"))
            .select_related("created_by")
            .prefetch_related("floor_plans")
        )

    def get_permissions(self):
        # Просмотр — все авторизованные, остальное — менеджер+
        if self.action in ("list", "retrieve", "map_points"):
            return [IsAuthenticated()]
        # update/partial_update — правка папки доступна любому автору
        if self.action in ("create", "update", "partial_update"):
            return [IsAuthenticated()]
        return [IsManagerOrAdmin()]  # destroy

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=["get"])
    def map_points(self, request):
        """GET /api/folders/map_points/ — папки с GPS для карты"""
        qs = self.get_queryset().filter(latitude__isnull=False)
        data = []
        for folder in qs:
            data.append({
                "id": folder.id,
                "name": folder.name,
                "latitude": folder.latitude,
                "longitude": folder.longitude,
                "photo_count": folder.photo_count,
            })
        return Response(data)


class FloorPlanViewSet(viewsets.ModelViewSet):
    """Планы этажей объекта (папки). У папки может быть 1+ этажей."""

    serializer_class = FloorPlanSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = FloorPlan.objects.select_related("folder")
        folder_id = self.kwargs.get("folder_id") or self.request.query_params.get(
            "folder"
        )
        if folder_id:
            qs = qs.filter(folder_id=folder_id)
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        # create/update — этажи ставит любой автор (как расстановку точек)
        if self.action in ("create", "update", "partial_update"):
            return [IsAuthenticated()]
        return [IsManagerOrAdmin()]  # destroy

    def perform_create(self, serializer):
        # В nested-роуте folder берём из URL
        folder_id = self.kwargs.get("folder_id")
        if folder_id:
            serializer.save(folder_id=folder_id)
        else:
            serializer.save()
