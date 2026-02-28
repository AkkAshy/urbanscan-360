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
    created_at = models.DateTimeField("Загружено", auto_now_add=True)

    class Meta:
        verbose_name = "Фото"
        verbose_name_plural = "Фотографии"
        ordering = ["shot_date", "created_at"]

    def __str__(self):
        return self.title or os.path.basename(self.image.name)
