"""
Бэкфилл GPS координат из EXIF для уже загруженных фото.

Использование:
    python manage.py backfill_gps
    python manage.py backfill_gps --dry-run   # только показать что обновится
"""

from django.core.management.base import BaseCommand

from apps.photos.models import Photo
from apps.photos.utils import extract_gps_coordinates


class Command(BaseCommand):
    help = "Извлекает GPS координаты из EXIF для фото без координат"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Только показать результаты, не сохранять",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        # Все фото без координат
        photos = Photo.objects.filter(latitude__isnull=True)
        total = photos.count()
        self.stdout.write(f"Фото без GPS: {total}")

        updated = 0
        failed = 0

        for photo in photos.iterator():
            try:
                lat, lon = extract_gps_coordinates(photo.image)
            except Exception as e:
                self.stderr.write(f"  [{photo.id}] Ошибка: {e}")
                failed += 1
                continue

            if lat is not None and lon is not None:
                if dry_run:
                    self.stdout.write(
                        f"  [{photo.id}] {photo.title} → "
                        f"{lat:.6f}, {lon:.6f}"
                    )
                else:
                    photo.latitude = lat
                    photo.longitude = lon
                    photo.save(update_fields=["latitude", "longitude"])
                updated += 1

        action = "Найдено" if dry_run else "Обновлено"
        self.stdout.write(
            self.style.SUCCESS(
                f"\n{action}: {updated}/{total} (ошибок: {failed})"
            )
        )
