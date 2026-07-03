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
    # План этажа вынесен в отдельную модель FloorPlan (многоэтажность, 2026-07-03).
    created_at = models.DateTimeField("Создано", auto_now_add=True)
    updated_at = models.DateTimeField("Обновлено", auto_now=True)

    class Meta:
        verbose_name = "Папка"
        verbose_name_plural = "Папки"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class FloorPlan(models.Model):
    """План одного этажа объекта. У папки (объекта) может быть 1+ этажей."""

    folder = models.ForeignKey(
        Folder,
        on_delete=models.CASCADE,
        related_name="floor_plans",
        verbose_name="Папка",
    )
    image = models.ImageField(
        "План этажа", upload_to="floor_plans/",
        help_text="Картинка плана; на ней расставляются точки-панорамы для навигации",
    )
    name = models.CharField("Название этажа", max_length=100, default="1 этаж")
    order = models.PositiveIntegerField("Порядок", default=0)
    created_at = models.DateTimeField("Создано", auto_now_add=True)

    class Meta:
        verbose_name = "План этажа"
        verbose_name_plural = "Планы этажей"
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.folder.name} — {self.name}"
