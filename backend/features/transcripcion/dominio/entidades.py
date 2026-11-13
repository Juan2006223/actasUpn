from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


class Estado:
    """Etapas por las que pasa una grabación hasta convertirse en propuesta de acta."""
    SUBIENDO = 'SUBIENDO'
    EN_COLA = 'EN_COLA'
    IDENTIFICANDO_HABLANTES = 'IDENTIFICANDO_HABLANTES'
    TRANSCRIBIENDO = 'TRANSCRIBIENDO'
    REDACTANDO = 'REDACTANDO'
    LISTO = 'LISTO'
    ERROR = 'ERROR'
    CANCELADO = 'CANCELADO'

    EN_PROCESO = (EN_COLA, IDENTIFICANDO_HABLANTES, TRANSCRIBIENDO, REDACTANDO)
    EJECUTANDO = (IDENTIFICANDO_HABLANTES, TRANSCRIBIENDO, REDACTANDO)
    TERMINALES = (LISTO, ERROR)


class ProcesamientoCancelado(Exception):
    """La persona quitó la grabación mientras se procesaba."""


EXTENSIONES_PERMITIDAS = frozenset({
    'mp3', 'm4a', 'wav', 'ogg', 'oga', 'opus', 'webm', 'aac', 'flac', 'wma', 'amr',
    'mp4', 'mkv', 'mov', 'avi', '3gp',
})

MAX_PARTES = 20


def extension_valida(nombre_archivo: str) -> Optional[str]:
    if not nombre_archivo or '.' not in nombre_archivo:
        return None
    ext = nombre_archivo.rsplit('.', 1)[1].lower().strip()
    return ext if ext in EXTENSIONES_PERMITIDAS else None


@dataclass
class Segmento:
    """Fragmento transcrito con su intervalo en segundos, la parte de la reunión a la que pertenece y quién habló."""
    inicio: float
    fin: float
    texto: str
    hablante: Optional[str] = None
    parte: int = 0

    def a_dict(self) -> Dict[str, Any]:
        return {'inicio': round(self.inicio, 2), 'fin': round(self.fin, 2), 'texto': self.texto,
                'hablante': self.hablante, 'parte': self.parte}

    @staticmethod
    def desde_dict(d: Dict[str, Any]) -> 'Segmento':
        return Segmento(float(d.get('inicio', 0)), float(d.get('fin', 0)), d.get('texto', ''),
                        d.get('hablante'), int(d.get('parte', 0) or 0))


@dataclass
class Turno:
    """Intervalo en el que habla una misma voz (resultado de identificar hablantes)."""
    inicio: float
    fin: float
    hablante: str


@dataclass
class Parte:
    """Un archivo de audio o una transcripción pegada. Una reunión larga puede llegar en varias partes."""
    tipo: str  # 'audio' | 'texto'
    nombre: str = ''
    tamano: int = 0
    recibido: int = 0
    ruta: str = ''
    texto: str = ''

    @property
    def completa(self) -> bool:
        return self.tipo == 'texto' or (self.tamano > 0 and self.recibido >= self.tamano)

    def a_dict(self) -> Dict[str, Any]:
        return {'tipo': self.tipo, 'nombre': self.nombre, 'tamano': self.tamano,
                'recibido': self.recibido, 'ruta': self.ruta, 'texto': self.texto}

    @staticmethod
    def desde_dict(d: Dict[str, Any]) -> 'Parte':
        return Parte(d.get('tipo', 'audio'), d.get('nombre', ''), int(d.get('tamano', 0) or 0),
                     int(d.get('recibido', 0) or 0), d.get('ruta', ''), d.get('texto', ''))


@dataclass
class Procesamiento:
    id: Optional[int]
    creador_id: int
    partes: List[Dict[str, Any]] = field(default_factory=list)
    estado: str = Estado.SUBIENDO
    progreso: int = 0
    mensaje: str = ''
    contexto: Dict[str, Any] = field(default_factory=dict)
    segmentos: List[Dict[str, Any]] = field(default_factory=list)
    nombres_hablantes: Dict[str, str] = field(default_factory=dict)
    propuesta: Dict[str, Any] = field(default_factory=dict)
    proveedor_redaccion: str = ''
    duracion_segundos: Optional[float] = None

    def puede_ser_usado_por(self, user_id: int, es_admin: bool = False) -> bool:
        return bool(es_admin or str(self.creador_id) == str(user_id))

    def lista_partes(self) -> List[Parte]:
        return [Parte.desde_dict(p) for p in self.partes]

    def guardar_partes(self, partes: List[Parte]) -> None:
        self.partes = [p.a_dict() for p in partes]

    @property
    def es_texto(self) -> bool:
        return bool(self.partes) and all(p.get('tipo') == 'texto' for p in self.partes)

    @property
    def subida_completa(self) -> bool:
        return bool(self.partes) and all(p.completa for p in self.lista_partes())

    @property
    def tiene_transcripcion(self) -> bool:
        return bool(self.segmentos)

    @property
    def nombre(self) -> str:
        partes = self.lista_partes()
        if not partes:
            return ''
        if self.es_texto:
            return 'Transcripción pegada' if len(partes) == 1 else f'Transcripción pegada en {len(partes)} partes'
        return partes[0].nombre if len(partes) == 1 else f'{len(partes)} archivos de audio'
