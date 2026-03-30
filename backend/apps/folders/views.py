from django.db.models import Count
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsManagerOrAdmin

from .models import Folder
from .serializers import FolderSerializer


class FolderViewSet(viewsets.ModelViewSet):
    serializer_class = FolderSerializer

    def get_queryset(self):
        return Folder.objects.annotate(photo_count=Count("photos")).select_related(
            "created_by"
        )

    def get_permissions(self):
        # Просмотр — все авторизованные, остальное — менеджер+
        if self.action in ("list", "retrieve", "map_points"):
            return [IsAuthenticated()]
        if self.action == "create":
            return [IsAuthenticated()]
        return [IsManagerOrAdmin()]

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
