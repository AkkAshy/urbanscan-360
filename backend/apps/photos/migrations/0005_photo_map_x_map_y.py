from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("photos", "0004_photo_preview"),
    ]

    operations = [
        migrations.AddField(
            model_name="photo",
            name="map_x",
            field=models.FloatField(
                blank=True,
                null=True,
                verbose_name="X на плане",
                help_text="Позиция точки на плане этажа, 0..1 (доля ширины)",
            ),
        ),
        migrations.AddField(
            model_name="photo",
            name="map_y",
            field=models.FloatField(
                blank=True,
                null=True,
                verbose_name="Y на плане",
                help_text="Позиция точки на плане этажа, 0..1 (доля высоты)",
            ),
        ),
    ]
