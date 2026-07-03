import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("folders", "0003_folder_floor_plan"),
    ]

    operations = [
        migrations.CreateModel(
            name="FloorPlan",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "image",
                    models.ImageField(
                        help_text="Картинка плана; на ней расставляются точки-панорамы для навигации",
                        upload_to="floor_plans/",
                        verbose_name="План этажа",
                    ),
                ),
                (
                    "name",
                    models.CharField(
                        default="1 этаж", max_length=100, verbose_name="Название этажа"
                    ),
                ),
                (
                    "order",
                    models.PositiveIntegerField(default=0, verbose_name="Порядок"),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="Создано"),
                ),
                (
                    "folder",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="floor_plans",
                        to="folders.folder",
                        verbose_name="Папка",
                    ),
                ),
            ],
            options={
                "verbose_name": "План этажа",
                "verbose_name_plural": "Планы этажей",
                "ordering": ["order", "id"],
            },
        ),
    ]
