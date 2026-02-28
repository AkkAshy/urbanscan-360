from django.contrib import admin

from .models import Folder


@admin.register(Folder)
class FolderAdmin(admin.ModelAdmin):
    list_display = ["name", "created_by", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["name"]
