import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("folders", "0004_floorplan"),
        ("photos", "0005_photo_map_x_map_y"),
    ]

    operations = [
        migrations.AddField(
            model_name="photo",
            name="floor",
            field=models.ForeignKey(
                blank=True,
                help_text="На каком этаже (плане) стоит точка этого фото",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="photos",
                to="folders.floorplan",
                verbose_name="Этаж",
            ),
        ),
    ]
