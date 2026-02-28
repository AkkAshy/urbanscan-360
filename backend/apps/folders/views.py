from django.db.models import Count
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

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
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        if self.action == "create":
            return [IsAuthenticated()]  # Все могут создавать папки
        return [IsManagerOrAdmin()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
