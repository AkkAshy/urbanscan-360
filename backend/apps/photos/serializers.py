from rest_framework import serializers

from .models import Photo
from .utils import extract_shot_date, generate_thumbnail


class PhotoSerializer(serializers.ModelSerializer):
    """Полный сериализатор фото"""

    uploaded_by_name = serializers.CharField(
        source="uploaded_by.username", read_only=True, default=""
    )

    class Meta:
        model = Photo
        fields = [
            "id",
            "folder",
            "title",
            "image",
            "thumbnail",
            "file_size",
            "uploaded_by",
            "uploaded_by_name",
            "shot_date",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "thumbnail",
            "file_size",
            "uploaded_by",
            "shot_date",
            "created_at",
        ]

    def create(self, validated_data):
        image_file = validated_data["image"]

        # Авто-заполнение title из имени файла
        if not validated_data.get("title"):
            import os
            validated_data["title"] = os.path.splitext(image_file.name)[0]

        # Размер файла
        validated_data["file_size"] = image_file.size

        # EXIF дата съёмки
        shot_date = extract_shot_date(image_file)
        if shot_date:
            validated_data["shot_date"] = shot_date

        # Создаём фото
        photo = Photo(**validated_data)
        photo.save()

        # Генерируем thumbnail после сохранения
        thumb = generate_thumbnail(image_file)
        if thumb:
            photo.thumbnail.save(thumb.name, thumb, save=True)

        return photo


class PhotoViewerSerializer(serializers.ModelSerializer):
    """Лёгкий сериализатор для вьювера — только нужные поля"""

    class Meta:
        model = Photo
        fields = ["id", "title", "image", "thumbnail", "shot_date"]
