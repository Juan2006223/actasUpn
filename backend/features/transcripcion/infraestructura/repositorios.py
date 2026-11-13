import os
from pathlib import Path
from typing import BinaryIO, Optional

from django.utils import timezone

from ..dominio.entidades import Estado, Procesamiento, ProcesamientoCancelado
from ..dominio.puertos import AlmacenAudios, RepositorioProcesamientos
from .models import ProcesamientoGrabacion

CAMPOS = (
    'creador_id', 'partes', 'estado', 'progreso', 'mensaje', 'contexto', 'segmentos',
    'nombres_hablantes', 'propuesta', 'proveedor_redaccion', 'duracion_segundos',
)


class DjangoRepositorioProcesamientos(RepositorioProcesamientos):
    @staticmethod
    def _a_entidad(m: ProcesamientoGrabacion) -> Procesamiento:
        return Procesamiento(id=m.id, **{c: getattr(m, c) for c in CAMPOS})

    @staticmethod
    def _vigentes(procesamiento_id: int):
        return ProcesamientoGrabacion.objects.filter(pk=procesamiento_id).exclude(estado=Estado.CANCELADO)

    def obtener(self, procesamiento_id: int) -> Optional[Procesamiento]:
        m = ProcesamientoGrabacion.objects.filter(pk=procesamiento_id).first()
        return self._a_entidad(m) if m else None

    def guardar(self, p: Procesamiento) -> Procesamiento:
        valores = {c: getattr(p, c) for c in CAMPOS}
        valores['mensaje'] = (valores['mensaje'] or '')[:500]
        if not p.id:
            return self._a_entidad(ProcesamientoGrabacion.objects.create(**valores))
        # Nunca se pisa una cancelación pedida mientras se trabajaba.
        if not self._vigentes(p.id).update(**valores, updated_at=timezone.now()):
            raise ProcesamientoCancelado()
        return self._a_entidad(ProcesamientoGrabacion.objects.get(pk=p.id))

    def actualizar_avance(self, procesamiento_id: int, estado: str, progreso: int, mensaje: str = '') -> None:
        cambios = {'estado': estado, 'progreso': progreso, 'updated_at': timezone.now()}
        if mensaje:
            cambios['mensaje'] = mensaje[:500]
        if not self._vigentes(procesamiento_id).update(**cambios):
            raise ProcesamientoCancelado()

    def marcar_cancelado(self, procesamiento_id: int) -> None:
        ProcesamientoGrabacion.objects.filter(pk=procesamiento_id).update(
            estado=Estado.CANCELADO, mensaje='Cancelando…', updated_at=timezone.now())

    def eliminar(self, procesamiento_id: int) -> None:
        ProcesamientoGrabacion.objects.filter(pk=procesamiento_id).delete()

    def tomar_siguiente_en_cola(self) -> Optional[Procesamiento]:
        candidatos = ProcesamientoGrabacion.objects.filter(estado=Estado.EN_COLA).order_by('id').values_list('id', flat=True)[:10]
        for pk in candidatos:
            # Actualización condicionada: si otro trabajador lo tomó primero, no afecta filas.
            tomado = ProcesamientoGrabacion.objects.filter(pk=pk, estado=Estado.EN_COLA).update(
                estado=Estado.TRANSCRIBIENDO, mensaje='Iniciando', updated_at=timezone.now())
            if tomado:
                return self.obtener(pk)
        return None

    def reencolar_interrumpidos(self) -> int:
        # Lo cancelado mientras el servidor estaba caído ya no se retoma: se borra.
        for m in ProcesamientoGrabacion.objects.filter(estado=Estado.CANCELADO):
            for parte in m.partes or []:
                if parte.get('ruta'):
                    try:
                        os.remove(parte['ruta'])
                    except OSError:
                        pass
            m.delete()
        return ProcesamientoGrabacion.objects.filter(estado__in=Estado.EJECUTANDO).update(
            estado=Estado.EN_COLA, mensaje='Reanudando tras un reinicio del servidor')

    def posicion_en_cola(self, procesamiento_id: int) -> int:
        antes = ProcesamientoGrabacion.objects.filter(estado=Estado.EN_COLA, pk__lt=procesamiento_id).count()
        ejecutando = ProcesamientoGrabacion.objects.filter(estado__in=Estado.EJECUTANDO).exists()
        return antes + (1 if ejecutando else 0)


class AlmacenAudiosEnDisco(AlmacenAudios):
    """Guarda las grabaciones con nombre generado (nunca el nombre que envía el usuario)."""

    def __init__(self, carpeta: Path):
        self.carpeta = Path(carpeta)

    def ruta_para(self, procesamiento_id: int, indice_parte: int, extension: str) -> str:
        self.carpeta.mkdir(parents=True, exist_ok=True)
        return str(self.carpeta / f'grabacion_{int(procesamiento_id)}_{int(indice_parte) + 1}.{extension}')

    def _dentro_de_carpeta(self, ruta: str) -> Path:
        destino = Path(ruta).resolve()
        if self.carpeta.resolve() not in destino.parents:
            raise ValueError('Ruta de audio fuera de la carpeta permitida.')
        return destino

    def tamano(self, ruta: str) -> int:
        destino = self._dentro_de_carpeta(ruta)
        return destino.stat().st_size if destino.exists() else 0

    def anexar(self, ruta: str, flujo: BinaryIO, max_bytes: int) -> int:
        destino = self._dentro_de_carpeta(ruta)
        escritos = 0
        with open(destino, 'ab') as f:
            while escritos < max_bytes:
                bloque = flujo.read(min(1024 * 1024, max_bytes - escritos))
                if not bloque:
                    break
                f.write(bloque)
                escritos += len(bloque)
        return escritos

    def eliminar(self, ruta: str) -> None:
        if not ruta:
            return
        try:
            os.remove(self._dentro_de_carpeta(ruta))
        except FileNotFoundError:
            pass
