from django.apps import AppConfig


class TranscripcionInfraConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'features.transcripcion.infraestructura'
    label = 'transcripcion'
    verbose_name = 'Transcripción de grabaciones'
