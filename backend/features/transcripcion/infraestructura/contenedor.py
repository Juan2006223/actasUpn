"""Arma los casos de uso con sus adaptadores según la configuración (settings.TRANSCRIPCION)."""
from pathlib import Path

from django.conf import settings

from ..aplicacion.casos_uso import (
    ConsultarProcesamiento, CrearProcesamiento, EjecutarProcesamiento, EliminarProcesamiento,
    RecibirParte, VolverARedactar,
)
from .modelos_lenguaje import crear_modelo
from .motores_audio import IdentificadorSherpa, TranscriptorWhisper
from .repositorios import AlmacenAudiosEnDisco, DjangoRepositorioProcesamientos


def config():
    return settings.TRANSCRIPCION


repo = DjangoRepositorioProcesamientos()


def almacen():
    return AlmacenAudiosEnDisco(Path(settings.MEDIA_ROOT) / 'grabaciones')


def transcriptor():
    c = config()
    return TranscriptorWhisper(c['WHISPER_MODELO'], c['CARPETA_MODELOS'], c['WHISPER_DISPOSITIVO'],
                               c['WHISPER_TIPO_COMPUTO'], c['WHISPER_HILOS'])


def identificador():
    c = config()
    if not c['IDENTIFICAR_HABLANTES']:
        return None
    return IdentificadorSherpa(c['CARPETA_MODELOS'], c['UMBRAL_HABLANTES'])


def modelo_lenguaje():
    return crear_modelo(config())


def ejecutar_procesamiento():
    return EjecutarProcesamiento(repo, almacen(), transcriptor, identificador, modelo_lenguaje,
                                 conservar_audio=config()['CONSERVAR_AUDIO'])


def _avisar_trabajador():
    from . import trabajador
    trabajador.avisar()


def crear_procesamiento():
    return CrearProcesamiento(repo, almacen(), config()['AUDIO_MAX_MB'] * 1024 * 1024)


def recibir_parte():
    return RecibirParte(repo, almacen(), _avisar_trabajador)


def consultar_procesamiento():
    return ConsultarProcesamiento(repo)


def volver_a_redactar():
    return VolverARedactar(repo, _avisar_trabajador)


def eliminar_procesamiento():
    return EliminarProcesamiento(repo, almacen())
