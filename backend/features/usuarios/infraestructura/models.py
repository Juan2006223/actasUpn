from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN', 'Administrador'),
        ('SUPERVISOR', 'Supervisor'),
        ('COORDINADOR', 'Coordinador'),
        ('TEACHER', 'Docente'),
        ('APOYO', 'Apoyo'),
        ('ASISTENTE', 'Asistente'),
        ('STUDENT', 'Estudiante'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='STUDENT')
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
