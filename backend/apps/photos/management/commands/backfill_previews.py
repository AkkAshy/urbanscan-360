"""Догенерировать preview + thumbnail для существующих фото (у которых их нет)."""

from django.core.management.base import BaseCommand

from apps.photos.models import Photo
from apps.photos.utils import generate_preview, generate_thumbnail


class Command(BaseCommand):
    help = "Генерирует preview (для вьювера) и thumbnail (для грида) для фото без них"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run", action="store_true", help="Только показать, что будет сделано"
        )
        parser.add_argument(
            "--force", action="store_true", help="Перегенерировать даже если уже есть"
        )

    def handle(self, *args, **opts):
        dry = opts["dry_run"]
        force = opts["force"]
        done = 0

        for photo in Photo.objects.all():
            need_preview = force or not photo.preview
            need_thumb = force or not photo.thumbnail
            if not (need_preview or need_thumb):
                continue
            if not photo.image:
                self.stdout.write(f"  #{photo.id} {photo.title}: нет image — пропуск")
                continue

            self.stdout.write(
                f"  #{photo.id} {photo.title}: preview={need_preview} thumbnail={need_thumb}"
            )
            if dry:
                done += 1
                continue

            try:
                photo.image.open("rb")
                if need_preview:
                    p = generate_preview(photo.image)
                    if p:
                        photo.preview.save(p.name, p, save=False)
                if need_thumb:
                    t = generate_thumbnail(photo.image)
                    if t:
                        photo.thumbnail.save(t.name, t, save=False)
                photo.save(update_fields=["preview", "thumbnail"])
                done += 1
            finally:
                photo.image.close()

        verb = "будет обработано" if dry else "обработано"
        self.stdout.write(self.style.SUCCESS(f"{verb}: {done} фото"))
