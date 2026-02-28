"""Утилиты для обработки фото: EXIF и thumbnails"""

import io
import os
from datetime import datetime

from django.core.files.base import ContentFile
from PIL import Image
from PIL.ExifTags import Base as ExifBase


def extract_shot_date(image_file):
    """Достать дату съёмки из EXIF. Возвращает datetime или None"""
    try:
        image_file.seek(0)
        img = Image.open(image_file)
        exif = img.getexif()
        if not exif:
            return None

        # DateTimeOriginal (tag 36867)
        date_str = exif.get(ExifBase.DateTimeOriginal) or exif.get(ExifBase.DateTime)
        if date_str:
            return datetime.strptime(date_str, "%Y:%m:%d %H:%M:%S")
    except Exception:
        pass
    finally:
        image_file.seek(0)
    return None


def generate_thumbnail(image_file, max_size=(400, 200)):
    """Генерирует thumbnail из загруженного файла. Возвращает ContentFile"""
    try:
        image_file.seek(0)
        img = Image.open(image_file)
        img.thumbnail(max_size, Image.LANCZOS)

        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=80)
        buffer.seek(0)

        # Имя файла: thumb_<оригинальное имя>.jpg
        original_name = os.path.splitext(os.path.basename(image_file.name))[0]
        thumb_name = f"thumb_{original_name}.jpg"

        return ContentFile(buffer.read(), name=thumb_name)
    except Exception:
        return None
    finally:
        image_file.seek(0)
