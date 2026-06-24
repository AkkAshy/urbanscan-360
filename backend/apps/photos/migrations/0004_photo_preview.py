from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("photos", "0003_photolink"),
    ]

    operations = [
        migrations.AddField(
            model_name="photo",
            name="preview",
            field=models.ImageField(
                blank=True,
                null=True,
                help_text="Сжатая 360-версия (~4096px) для быстрой загрузки в сцене",
                upload_to="photos/previews/",
                verbose_name="Превью для вьювера",
            ),
        ),
    ]
