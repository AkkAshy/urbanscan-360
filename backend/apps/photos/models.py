import os

from django.conf import settings
from django.db import models


def photo_upload_path(instance, filename):
    """Загрузка в media/photos/<folder_id>/<filename>"""
    return f"photos/{instance.folder_id}/{filename}"


class Photo(models.Model):
    """360° эквиректангулярная фотография"""

    folder = models.ForeignKey(
        "folders.Folder",
        on_delete=models.CASCADE,
        related_name="photos",
        verbose_name="Папка",
    )
    title = models.CharField("Название", max_length=255, blank=True)
    image = models.ImageField("Фото", upload_to=photo_upload_path)
    thumbnail = models.ImageField(
        "Превью", upload_to="photos/thumbnails/", blank=True, null=True
    )
    file_size = models.PositiveIntegerField("Размер (байт)", default=0)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="photos",
        verbose_name="Загрузил",
    )
    shot_date = models.DateTimeField(
        "Дата съёмки", null=True, blank=True, help_text="Из EXIF или ручной ввод"
    )
    latitude = models.FloatField(
        "Широта", null=True, blank=True, db_index=True,
        help_text="Из EXIF GPS или ручной ввод",
    )
    longitude = models.FloatField(
        "Долгота", null=True, blank=True, db_index=True,
        help_text="Из EXIF GPS или ручной ввод",
    )
    created_at = models.DateTimeField("Загружено", auto_now_add=True)

    class Meta:
        verbose_name = "Фото"
        verbose_name_plural = "Фотографии"
        ordering = ["shot_date", "created_at"]

    def __str__(self):
        return self.title or os.path.basename(self.image.name)


class PhotoLink(models.Model):
    """Связь между двумя фото — хотспот (дверь, проход и т.д.)"""

    from_photo = models.ForeignKey(
        Photo,
        on_delete=models.CASCADE,
        related_name="links_from",
        verbose_name="Из фото",
    )
    to_photo = models.ForeignKey(
        Photo,
        on_delete=models.CASCADE,
        related_name="links_to",
        verbose_name="В фото",
    )
    yaw = models.FloatField(
        "Yaw (°)",
        help_text="Горизонтальный угол стрелки в сцене (0-360°)",
    )
    pitch = models.FloatField(
        "Pitch (°)",
        default=0,
        help_text="Вертикальный угол стрелки в сцене",
    )
    created_at = models.DateTimeField("Создано", auto_now_add=True)

    class Meta:
        verbose_name = "Связь фото"
        verbose_name_plural = "Связи фото"
        unique_together = ("from_photo", "to_photo")

    def __str__(self):
        return f"{self.from_photo} → {self.to_photo}"
