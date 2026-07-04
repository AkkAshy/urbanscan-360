from rest_framework import serializers

from .models import FloorPlan, Folder


class FloorPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = FloorPlan
        fields = ["id", "folder", "image", "name", "order", "created_at"]
        # folder берётся из URL (nested-роут) в perform_create, не из тела запроса
        read_only_fields = ["id", "folder", "created_at"]


class FolderSerializer(serializers.ModelSerializer):
    photo_count = serializers.IntegerField(read_only=True, default=0)
    created_by_name = serializers.CharField(
        source="created_by.username", read_only=True, default=""
    )
    floor_plans = FloorPlanSerializer(many=True, read_only=True)

    class Meta:
        model = Folder
        fields = [
            "id",
            "name",
            "description",
            "created_by",
            "created_by_name",
            "photo_count",
            "latitude",
            "longitude",
            "floor_plans",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]
