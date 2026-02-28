from django.contrib import admin

from .models import Photo


@admin.register(Photo)
class PhotoAdmin(admin.ModelAdmin):
    list_display = ["title", "folder", "uploaded_by", "shot_date", "created_at"]
    list_filter = ["folder", "created_at"]
    search_fields = ["title"]
