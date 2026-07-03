from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("folders", "0002_folder_latitude_folder_longitude"),
    ]

    operations = [
        migrations.AddField(
            model_name="folder",
            name="floor_plan",
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to="floor_plans/",
                verbose_name="План этажа",
                help_text="Картинка плана; на ней расставляются точки-панорамы для навигации",
            ),
        ),
    ]
