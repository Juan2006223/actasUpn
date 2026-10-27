from django.db import models

class Grupo(models.Model):
    name = models.CharField(max_length=150, verbose_name="Nombre / Cohorte")
    date = models.DateField(verbose_name="Fecha de inicio")
    description = models.TextField(blank=True, verbose_name="Descripcion")
    features = models.TextField(blank=True, verbose_name="Caracteristicas y condiciones")
    advisor_id = models.IntegerField(null=True, blank=True, verbose_name="ID Asesor")
    advisor_name = models.CharField(max_length=200, blank=True, verbose_name="Nombre Asesor")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']
        verbose_name = "Grupo / Cohorte"
        verbose_name_plural = "Grupos / Cohortes"

    def __str__(self):
        return f"{self.name} - {self.advisor_name or 'Sin asesor'}"
