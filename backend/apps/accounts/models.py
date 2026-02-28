from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Пользователь с ролью доступа"""

    class Role(models.TextChoices):
        ADMIN = "admin", "Администратор"
        MANAGER = "manager", "Менеджер"
        UPLOADER = "uploader", "Загрузчик"

    role = models.CharField(
        "Роль",
        max_length=20,
        choices=Role.choices,
        default=Role.UPLOADER,
    )

    class Meta:
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"
