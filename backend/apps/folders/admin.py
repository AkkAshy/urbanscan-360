from django.contrib import admin

from .models import FloorPlan, Folder


@admin.register(Folder)
class FolderAdmin(admin.ModelAdmin):
    list_display = ["name", "created_by", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["name"]


@admin.register(FloorPlan)
class FloorPlanAdmin(admin.ModelAdmin):
    list_display = ["folder", "name", "order", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["name", "folder__name"]
    ordering = ["folder", "order"]
