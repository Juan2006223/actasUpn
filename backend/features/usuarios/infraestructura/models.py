from django.contrib.auth.models import AbstractUser
from django.db import models

class Dependencia(models.Model):
    """Dependencia institucional (facultad, centro, oficina). La administra el superadministrador."""
    nombre = models.CharField(max_length=150, unique=True)
    activa = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nombre']
        verbose_name = 'Dependencia'
        verbose_name_plural = 'Dependencias'

    def __str__(self):
        return self.nombre


class User(AbstractUser):
    # Rol en la plataforma. El cargo institucional (director, docente...) va aparte en `cargo`.
    ROLE_CHOICES = (
        ('ADMIN', 'Superadministrador'),
        ('REVISOR', 'Revisor'),
        ('REDACTOR', 'Redactor'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='REDACTOR')
    cargo = models.CharField(max_length=150, blank=True, default='')
    dependencia = models.ForeignKey(
        Dependencia, null=True, blank=True, on_delete=models.SET_NULL, related_name='usuarios')
    document_number = models.CharField(max_length=30, unique=True, null=True, blank=True)
    personal_email = models.EmailField(blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    photo = models.ImageField(upload_to='profiles/', blank=True, null=True)
    is_directory_imported = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.username})"


class DirectoryImportBatch(models.Model):
    file_name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    created_count = models.PositiveIntegerField(default=0)
    updated_count = models.PositiveIntegerField(default=0)
    skipped_count = models.PositiveIntegerField(default=0)
    errors = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Lote de importacion directorio'
