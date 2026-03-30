from django.conf import settings
from django.db import models


class Folder(models.Model):
    """Папка для группировки 360° фотографий"""

    name = models.CharField("Название", max_length=255)
    description = models.TextField("Описание", blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="folders",
        verbose_name="Создатель",
    )
    latitude = models.FloatField(
        "Широта", null=True, blank=True,
        help_text="GPS координата здания/объекта",
    )
    longitude = models.FloatField(
        "Долгота", null=True, blank=True,
        help_text="GPS координата здания/объекта",
    )
    created_at = models.DateTimeField("Создано", auto_now_add=True)
    updated_at = models.DateTimeField("Обновлено", auto_now=True)

    class Meta:
        verbose_name = "Папка"
        verbose_name_plural = "Папки"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name
