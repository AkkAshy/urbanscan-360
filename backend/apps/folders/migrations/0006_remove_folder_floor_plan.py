from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("folders", "0005_migrate_floor_plans"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="folder",
            name="floor_plan",
        ),
    ]
