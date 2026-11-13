from django.db import models


class ProcesamientoGrabacion(models.Model):
    """Una reunión (en uno o varios audios o transcripciones) en camino a convertirse en propuesta de acta."""
    creador_id = models.IntegerField(db_index=True)
    partes = models.JSONField(default=list, blank=True)
    estado = models.CharField(max_length=30, db_index=True)
    progreso = models.PositiveSmallIntegerField(default=0)
    mensaje = models.CharField(max_length=500, blank=True)
    contexto = models.JSONField(default=dict, blank=True)
    segmentos = models.JSONField(default=list, blank=True)
    nombres_hablantes = models.JSONField(default=dict, blank=True)
    propuesta = models.JSONField(default=dict, blank=True)
    proveedor_redaccion = models.CharField(max_length=100, blank=True)
    duracion_segundos = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Procesamiento de grabación'
        verbose_name_plural = 'Procesamientos de grabaciones'
