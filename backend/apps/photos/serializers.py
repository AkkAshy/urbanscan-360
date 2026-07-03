from rest_framework import serializers

from .models import Photo, PhotoLink
from .utils import (
    extract_gps_coordinates,
    extract_shot_date,
    generate_preview,
    generate_thumbnail,
    is_insp,
    stitch_insp,
)


class PhotoSerializer(serializers.ModelSerializer):
    """Полный сериализатор фото"""

    uploaded_by_name = serializers.CharField(
        source="uploaded_by.username", read_only=True, default=""
    )
    # Django 6 валидирует расширение ВНУТРИ forms.ImageField.to_python (.insp там
    # нет), и DRF ImageField это наследует. Берём FileField — он не проверяет
    # расширение/формат: .insp сшивается в create(), обычные картинки проходят
    # дальше (Pillow открывает их в generate_preview/thumbnail).
    image = serializers.FileField()

    class Meta:
        model = Photo
        fields = [
            "id",
            "folder",
            "title",
            "image",
            "thumbnail",
            "preview",
            "file_size",
            "uploaded_by",
            "uploaded_by_name",
            "shot_date",
            "latitude",
            "longitude",
            "map_x",
            "map_y",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "thumbnail",
            "preview",
            "file_size",
            "uploaded_by",
            "shot_date",
            "created_at",
        ]

    def create(self, validated_data):
        import os

        image_file = validated_data["image"]
        original_name = image_file.name

        # Авто-заполнение title из имени файла (без расширения)
        if not validated_data.get("title"):
            validated_data["title"] = os.path.splitext(original_name)[0]

        # EXIF дата + GPS — ИЗ ОРИГИНАЛА (у .insp ffmpeg-стичинг EXIF теряет,
        # поэтому читаем ДО стичинга).
        shot_date = extract_shot_date(image_file)
        if shot_date:
            validated_data["shot_date"] = shot_date
        lat, lon = extract_gps_coordinates(image_file)
        if lat is not None and lon is not None:
            validated_data["latitude"] = lat
            validated_data["longitude"] = lon

        # Insta360 .insp (dual-fisheye) → сшиваем в equirectangular JPEG
        if is_insp(original_name):
            stitched = stitch_insp(image_file)
            if stitched is None:
                raise serializers.ValidationError(
                    {"image": "Не удалось обработать .insp — проверь ffmpeg на сервере."}
                )
            image_file = stitched
            validated_data["image"] = stitched

        # Размер файла (уже сшитого, если это был .insp)
        validated_data["file_size"] = image_file.size

        # Создаём фото
        photo = Photo(**validated_data)
        photo.save()

        # Генерируем preview (для вьювера) + thumbnail (для грида) после сохранения
        preview = generate_preview(image_file)
        if preview:
            photo.preview.save(preview.name, preview, save=False)
        thumb = generate_thumbnail(image_file)
        if thumb:
            photo.thumbnail.save(thumb.name, thumb, save=False)
        photo.save(update_fields=["preview", "thumbnail"])

        return photo


class PhotoLinkSerializer(serializers.ModelSerializer):
    """Связь между фото (хотспот на двери)"""

    to_title = serializers.CharField(source="to_photo.title", read_only=True)
    to_thumbnail = serializers.SerializerMethodField()

    class Meta:
        model = PhotoLink
        fields = [
            "id",
            "from_photo",
            "to_photo",
            "to_title",
            "to_thumbnail",
            "yaw",
            "pitch",
        ]
        read_only_fields = ["id"]

    def get_to_thumbnail(self, obj):
        if obj.to_photo.thumbnail:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.to_photo.thumbnail.url)
            return obj.to_photo.thumbnail.url
        return None


class PhotoViewerSerializer(serializers.ModelSerializer):
    """Лёгкий сериализатор для вьювера — только нужные поля"""

    class Meta:
        model = Photo
        fields = ["id", "title", "image", "thumbnail", "preview", "shot_date", "latitude", "longitude", "map_x", "map_y"]
