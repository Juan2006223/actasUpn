from django.db import models

class Documento(models.Model):
    TIPO_CHOICES = [
        ('Acta Estudiantes', 'Acta Estudiantes'),
        ('Informe', 'Informe'),
        ('Memorando', 'Memorando'),
        ('Otro', 'Otro'),
    ]
    title = models.CharField(max_length=255, verbose_name="Titulo")
    type = models.CharField(max_length=50, choices=TIPO_CHOICES, default='Informe')
    date = models.DateField(verbose_name="Fecha")
    purpose = models.TextField(verbose_name="Proposito del documento")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']
        verbose_name = "Documento"
        verbose_name_plural = "Documentos"

    def __str__(self):
        return f"{self.title} ({self.type})"


class ActaReunion(models.Model):
    """
    Formato FOR023GDC UPN.
    Todos los datos del formulario se almacenan integramente en data (JSONField).
    """
    data = models.JSONField(default=dict, blank=True)
    creador_id = models.IntegerField(null=True, blank=True, db_index=True)
    participantes_ids = models.JSONField(default=list, blank=True)
    ESTADO_CHOICES = [
        ('BORRADOR', 'Borrador'),
        ('EN_REVISION', 'En revisión'),
        ('PARA_FIRMA', 'Publicada para firmas'),
    ]
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='BORRADOR', db_index=True)
    # Dependencia de quien la creó: define qué revisor puede verla y corregirla.
    dependencia_id = models.IntegerField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Acta de Reunion"
        verbose_name_plural = "Actas de Reunion"


class FirmaUsuario(models.Model):
    """Firma personal almacenada en Base64."""
    user_id = models.IntegerField(unique=True)
    firma_data = models.TextField(help_text='Base64 de la imagen de firma')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Firma de Usuario'
        verbose_name_plural = 'Firmas de Usuarios'
