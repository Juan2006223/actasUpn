from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    dependencia_id = serializers.IntegerField(read_only=True, allow_null=True)
    dependencia_nombre = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'role',
            'cargo',
            'dependencia_id',
            'dependencia_nombre',
            'document_number',
            'photo',
            'is_active',
        ]
        read_only_fields = ['id', 'full_name', 'dependencia_nombre']

    def get_full_name(self, obj):
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name or obj.username

    def get_dependencia_nombre(self, obj):
        return obj.dependencia.nombre if obj.dependencia_id else ''
