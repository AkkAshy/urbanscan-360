from django.db import migrations


def create_floor_plans(apps, schema_editor):
    """Каждой папке с существующим floor_plan → один этаж «1 этаж»,
    все её фото с точками (map_x/map_y) перецепляем на этот этаж."""
    Folder = apps.get_model("folders", "Folder")
    FloorPlan = apps.get_model("folders", "FloorPlan")
    Photo = apps.get_model("photos", "Photo")

    for folder in Folder.objects.all():
        if not folder.floor_plan:
            continue
        floor = FloorPlan.objects.create(
            folder=folder,
            image=folder.floor_plan.name,  # тот же файл в media/floor_plans/
            name="1 этаж",
            order=0,
        )
        Photo.objects.filter(
            folder=folder, map_x__isnull=False, map_y__isnull=False
        ).update(floor=floor)


def reverse(apps, schema_editor):
    """Откат: снять этажи. floor_plan на папках ещё существует (удаляется в 0006),
    так что данные не теряются при откате назад к 0004."""
    FloorPlan = apps.get_model("folders", "FloorPlan")
    Photo = apps.get_model("photos", "Photo")
    Photo.objects.filter(floor__isnull=False).update(floor=None)
    FloorPlan.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("folders", "0004_floorplan"),
        ("photos", "0006_photo_floor"),
    ]

    operations = [
        migrations.RunPython(create_floor_plans, reverse),
    ]
