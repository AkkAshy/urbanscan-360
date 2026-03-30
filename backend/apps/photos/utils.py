"""Утилиты для обработки фото: EXIF, GPS, thumbnails"""

import io
import math
import os
from datetime import datetime

from django.core.files.base import ContentFile
from PIL import Image
from PIL.ExifTags import Base as ExifBase


# === EXIF ===

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


def extract_gps_coordinates(image_file):
    """Достать GPS координаты из EXIF. Возвращает (lat, lon) или (None, None)"""
    try:
        image_file.seek(0)
        img = Image.open(image_file)
        exif = img.getexif()
        if not exif:
            return None, None

        # GPS данные лежат в sub-IFD 0x8825 (GPSInfo)
        gps_ifd = exif.get_ifd(0x8825)
        if not gps_ifd:
            return None, None

        # Теги: 1=LatRef, 2=Lat DMS, 3=LonRef, 4=Lon DMS
        lat_ref = gps_ifd.get(1)  # 'N' or 'S'
        lat_dms = gps_ifd.get(2)  # (degrees, minutes, seconds)
        lon_ref = gps_ifd.get(3)  # 'E' or 'W'
        lon_dms = gps_ifd.get(4)  # (degrees, minutes, seconds)

        if not all([lat_ref, lat_dms, lon_ref, lon_dms]):
            return None, None

        lat = _dms_to_decimal(lat_dms, lat_ref)
        lon = _dms_to_decimal(lon_dms, lon_ref)
        return lat, lon
    except Exception:
        return None, None
    finally:
        image_file.seek(0)


def _dms_to_decimal(dms, ref):
    """DMS (degrees, minutes, seconds) → десятичные градусы"""
    degrees = float(dms[0])
    minutes = float(dms[1])
    seconds = float(dms[2])
    decimal = degrees + minutes / 60 + seconds / 3600
    if ref in ("S", "W"):
        decimal = -decimal
    return decimal


# === Геоматематика ===

def haversine(lat1, lon1, lat2, lon2):
    """Расстояние между двумя GPS точками в метрах"""
    R = 6371000  # радиус Земли
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def calculate_bearing(lat1, lon1, lat2, lon2):
    """Азимут от точки 1 к точке 2 в градусах (0=север, 90=восток)"""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dlam = math.radians(lon2 - lon1)
    x = math.sin(dlam) * math.cos(phi2)
    y = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(dlam)
    bearing = math.degrees(math.atan2(x, y))
    return (bearing + 360) % 360  # нормализация 0-360


# === Thumbnails ===

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
