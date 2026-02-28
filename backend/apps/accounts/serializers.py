from django.contrib.auth import authenticate
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Сериализатор пользователя"""

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email", "role"]
        read_only_fields = ["id"]


class UserCreateSerializer(serializers.ModelSerializer):
    """Создание пользователя (только для админа)"""

    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email", "role", "password"]
        read_only_fields = ["id"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    """Логин — возвращает JWT токены"""

    username = serializers.CharField()
    password = serializers.CharField()

    def validate(self, data):
        user = authenticate(username=data["username"], password=data["password"])
        if not user:
            raise serializers.ValidationError("Неверный логин или пароль")
        if not user.is_active:
            raise serializers.ValidationError("Аккаунт деактивирован")
        data["user"] = user
        return data
