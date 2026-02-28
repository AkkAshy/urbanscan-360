from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Только администратор"""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "admin"


class IsManagerOrAdmin(BasePermission):
    """Менеджер или администратор"""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in (
            "admin",
            "manager",
        )


class CanUpload(BasePermission):
    """Любой авторизованный пользователь может загружать"""

    def has_permission(self, request, view):
        return request.user.is_authenticated
