from abc import ABC, abstractmethod
from typing import BinaryIO, Callable, List, Optional, Tuple

from .entidades import Procesamiento, Segmento, Turno

# Recibe un número entre 0 y 1 con el avance de la etapa actual.
ReportarAvance = Callable[[float], None]


class Transcriptor(ABC):
    @abstractmethod
    def transcribir(self, ruta_audio: str, avance: ReportarAvance) -> Tuple[List[Segmento], float]:
        """Devuelve los segmentos y la duración total del audio en segundos."""
        ...


class IdentificadorHablantes(ABC):
    @abstractmethod
    def identificar(self, rutas_audio: List[str], avance: ReportarAvance, num_hablantes: Optional[int] = None) -> List[Turno]:
        """Identifica voces en los audios tomados como uno solo (uno tras otro), para que
        'Hablante 1' sea la misma persona en todas las partes."""
        ...


class ModeloLenguaje(ABC):
    """Cualquier IA de texto (local o en la nube) que redacta a partir de un prompt."""

    nombre: str = ''
    # Cuánto texto de transcripción cabe en una sola petición. Si no cabe, se resume por partes.
    max_caracteres_transcripcion: int = 12000

    @abstractmethod
    def completar(self, prompt: str, formato_json: bool = False) -> str:
        ...


class AlmacenAudios(ABC):
    @abstractmethod
    def ruta_para(self, procesamiento_id: int, indice_parte: int, extension: str) -> str:
        ...

    @abstractmethod
    def tamano(self, ruta: str) -> int:
        ...

    @abstractmethod
    def anexar(self, ruta: str, flujo: BinaryIO, max_bytes: int) -> int:
        """Agrega bytes al final del archivo y devuelve cuántos escribió."""
        ...

    @abstractmethod
    def eliminar(self, ruta: str) -> None:
        ...


class RepositorioProcesamientos(ABC):
    @abstractmethod
    def obtener(self, procesamiento_id: int) -> Optional[Procesamiento]:
        ...

    @abstractmethod
    def guardar(self, p: Procesamiento) -> Procesamiento:
        """Lanza ProcesamientoCancelado si mientras tanto se pidió cancelarlo."""
        ...

    @abstractmethod
    def actualizar_avance(self, procesamiento_id: int, estado: str, progreso: int, mensaje: str = '') -> None:
        """Lanza ProcesamientoCancelado si se pidió cancelarlo."""
        ...

    @abstractmethod
    def marcar_cancelado(self, procesamiento_id: int) -> None:
        ...

    @abstractmethod
    def eliminar(self, procesamiento_id: int) -> None:
        ...

    @abstractmethod
    def tomar_siguiente_en_cola(self) -> Optional[Procesamiento]:
        """Marca como tomado y devuelve el siguiente pendiente, o None."""
        ...

    @abstractmethod
    def reencolar_interrumpidos(self) -> int:
        """Devuelve a la cola lo que quedó a medias (p. ej. si se reinició el servidor)."""
        ...

    @abstractmethod
    def posicion_en_cola(self, procesamiento_id: int) -> int:
        """Cuántos procesamientos van antes (incluido el que se está ejecutando)."""
        ...
