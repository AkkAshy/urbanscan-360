from rest_framework import serializers

from .models import Folder


class FolderSerializer(serializers.ModelSerializer):
    photo_count = serializers.IntegerField(read_only=True, default=0)
    created_by_name = serializers.CharField(
        source="created_by.username", read_only=True, default=""
    )

    class Meta:
        model = Folder
        fields = [
            "id",
            "name",
            "description",
            "created_by",
            "created_by_name",
            "photo_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]
