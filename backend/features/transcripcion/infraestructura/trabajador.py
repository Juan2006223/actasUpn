"""Procesa las grabaciones en cola, una a la vez (transcribir usa toda la CPU).

Por defecto corre como hilo dentro del servidor web. En producción con varios procesos web
se recomienda TRANSCRIPCION_TRABAJADOR_EN_SERVIDOR=False y ejecutar aparte:
    python manage.py procesar_grabaciones
"""
import logging
import threading

from django.conf import settings
from django.db import close_old_connections

log = logging.getLogger(__name__)

_evento = threading.Event()
_lock = threading.Lock()
_hilo = None
ESPERA_SIN_TRABAJO = 30


def procesar_pendientes() -> int:
    from . import contenedor
    hechos = 0
    while True:
        close_old_connections()
        p = contenedor.repo.tomar_siguiente_en_cola()
        if not p:
            return hechos
        log.info('Procesando grabación %s', p.id)
        contenedor.ejecutar_procesamiento().ejecutar(p)
        hechos += 1


def bucle(detener: threading.Event = None):
    from . import contenedor
    close_old_connections()
    reanudados = contenedor.repo.reencolar_interrumpidos()
    if reanudados:
        log.info('Se reanudan %s procesamientos interrumpidos', reanudados)
    while not (detener and detener.is_set()):
        try:
            procesar_pendientes()
        except Exception:  # noqa: BLE001 — el trabajador no debe morir por un fallo puntual
            log.exception('Error en el trabajador de grabaciones')
        finally:
            close_old_connections()
        _evento.wait(ESPERA_SIN_TRABAJO)
        _evento.clear()


def asegurar_en_ejecucion() -> None:
    global _hilo
    if not settings.TRANSCRIPCION['TRABAJADOR_EN_SERVIDOR']:
        return
    with _lock:
        if _hilo is None or not _hilo.is_alive():
            _hilo = threading.Thread(target=bucle, name='trabajador-grabaciones', daemon=True)
            _hilo.start()


def avisar() -> None:
    asegurar_en_ejecucion()
    _evento.set()
