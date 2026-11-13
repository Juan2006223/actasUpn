import logging
from typing import Any, BinaryIO, Callable, Dict, List, Optional

from ..dominio.entidades import (
    MAX_PARTES, Estado, Parte, Procesamiento, ProcesamientoCancelado, Segmento, extension_valida,
)
from ..dominio.puertos import (
    AlmacenAudios, IdentificadorHablantes, ModeloLenguaje, RepositorioProcesamientos, Transcriptor,
)
from ..dominio.servicios import asignar_hablantes, renumerar_hablantes, segmentos_desde_texto
from .redaccion import GenerarPropuestaActa

log = logging.getLogger(__name__)

# Porcentaje de la barra donde termina cada etapa de un audio (la redacción va hasta 99).
FIN_TRANSCRIPCION = 30
FIN_HABLANTES = 40

CAMPOS_CONTEXTO = ('tipo', 'fecha', 'hora_inicio', 'hora_final', 'instancias', 'lugar', 'asistentes', 'ausentes', 'invitados', 'orden_dia')
MAX_TEXTO_PEGADO = 2_000_000


def limpiar_contexto(contexto: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Solo se guardan los datos del acta que sirven para redactar."""
    contexto = contexto if isinstance(contexto, dict) else {}
    limpio = {k: contexto.get(k) for k in CAMPOS_CONTEXTO if contexto.get(k) not in (None, '')}
    for clave in ('asistentes', 'ausentes', 'invitados'):
        filas = limpio.get(clave) if isinstance(limpio.get(clave), list) else []
        limpio[clave] = [
            {'nombre': str(p.get('nombre', ''))[:200], 'cargo': str(p.get('cargo', ''))[:200]}
            for p in filas[:200] if isinstance(p, dict)
        ]
    if 'orden_dia' in limpio:
        limpio['orden_dia'] = str(limpio['orden_dia'])[:5000]
    num = contexto.get('num_hablantes')
    if num not in (None, '') and str(num).isdigit() and 1 <= int(num) <= 50:
        limpio['num_hablantes'] = int(num)
    return limpio


class ErrorDeValidacion(ValueError):
    pass


def _verificar_dueno(p: Optional[Procesamiento], user_id: int, es_admin: bool) -> Procesamiento:
    if not p or p.estado == Estado.CANCELADO:
        raise LookupError('Procesamiento no encontrado.')
    if not p.puede_ser_usado_por(user_id, es_admin):
        raise PermissionError('No tienes permiso sobre este procesamiento.')
    return p


class CrearProcesamiento:
    """Una reunión puede llegar en varias partes: varios audios o varias transcripciones, en orden."""

    def __init__(self, repo: RepositorioProcesamientos, almacen: AlmacenAudios, max_bytes: int):
        self.repo = repo
        self.almacen = almacen
        self.max_bytes = max_bytes

    def ejecutar(self, creador_id: int, archivos: Optional[List[Dict[str, Any]]] = None,
                 textos: Optional[List[str]] = None, contexto: Optional[Dict[str, Any]] = None) -> Procesamiento:
        contexto = limpiar_contexto(contexto)
        archivos = [a for a in (archivos or []) if isinstance(a, dict)]
        textos = [str(t).strip() for t in (textos or []) if str(t or '').strip()]
        if archivos and textos:
            raise ErrorDeValidacion('Envía solo audios o solo transcripciones, no ambos a la vez.')
        if not archivos and not textos:
            raise ErrorDeValidacion('No se recibió ninguna grabación ni transcripción.')
        if len(archivos) + len(textos) > MAX_PARTES:
            raise ErrorDeValidacion(f'Máximo {MAX_PARTES} partes por reunión.')

        if textos:
            if sum(len(t) for t in textos) > MAX_TEXTO_PEGADO:
                raise ErrorDeValidacion('La transcripción pegada es demasiado larga.')
            p = Procesamiento(id=None, creador_id=creador_id, estado=Estado.EN_COLA, contexto=contexto, mensaje='En cola')
            p.guardar_partes([Parte('texto', f'Parte {i + 1}', texto=t) for i, t in enumerate(textos)])
            return self.repo.guardar(p)

        partes = []
        for a in archivos:
            nombre = str(a.get('nombre_archivo', ''))[:255]
            ext = extension_valida(nombre)
            if not ext:
                raise ErrorDeValidacion(f'"{nombre}" no tiene un formato soportado. Usa audio o video (mp3, m4a, wav, ogg, webm, mp4…).')
            try:
                tamano = int(a.get('tamano_bytes', 0))
            except (TypeError, ValueError):
                raise ErrorDeValidacion('Tamaño de archivo inválido.')
            if tamano <= 0:
                raise ErrorDeValidacion(f'"{nombre}" está vacío.')
            partes.append((nombre, ext, tamano))
        if sum(t for _, _, t in partes) > self.max_bytes:
            raise ErrorDeValidacion(f'Los archivos superan el máximo permitido ({self.max_bytes // (1024 * 1024)} MB en total).')

        p = Procesamiento(id=None, creador_id=creador_id, estado=Estado.SUBIENDO, contexto=contexto, mensaje='Subiendo archivos')
        p.guardar_partes([Parte('audio', nombre, tamano) for nombre, _, tamano in partes])
        p = self.repo.guardar(p)
        p.guardar_partes([
            Parte('audio', nombre, tamano, ruta=self.almacen.ruta_para(p.id, i, ext))
            for i, (nombre, ext, tamano) in enumerate(partes)
        ])
        return self.repo.guardar(p)


class RecibirParte:
    """Subida por trozos: si se corta la conexión, se reanuda desde el último byte recibido."""

    def __init__(self, repo: RepositorioProcesamientos, almacen: AlmacenAudios, al_completar: Callable[[], None]):
        self.repo = repo
        self.almacen = almacen
        self.al_completar = al_completar

    def ejecutar(self, procesamiento_id: int, user_id: int, es_admin: bool, indice: int, offset: int,
                 flujo: BinaryIO, longitud: int) -> Procesamiento:
        p = _verificar_dueno(self.repo.obtener(procesamiento_id), user_id, es_admin)
        if p.estado != Estado.SUBIENDO:
            raise ErrorDeValidacion('Esta grabación ya no está recibiendo archivos.')
        partes = p.lista_partes()
        if not 0 <= indice < len(partes) or partes[indice].tipo != 'audio':
            raise ErrorDeValidacion('Parte inexistente.')
        parte = partes[indice]
        recibido = self.almacen.tamano(parte.ruta)
        if offset != recibido:
            # El cliente reintenta desde donde el servidor realmente va.
            parte.recibido = recibido
            p.guardar_partes(partes)
            return p
        if longitud <= 0 or recibido + longitud > parte.tamano:
            raise ErrorDeValidacion('El trozo enviado no coincide con el tamaño declarado.')
        parte.recibido = recibido + self.almacen.anexar(parte.ruta, flujo, longitud)
        p.guardar_partes(partes)
        if p.subida_completa:
            p.estado, p.mensaje, p.progreso = Estado.EN_COLA, 'En cola', 0
        p = self.repo.guardar(p)
        if p.estado == Estado.EN_COLA:
            self.al_completar()
        return p


class ConsultarProcesamiento:
    def __init__(self, repo: RepositorioProcesamientos):
        self.repo = repo

    def ejecutar(self, procesamiento_id: int, user_id: int, es_admin: bool) -> Procesamiento:
        return _verificar_dueno(self.repo.obtener(procesamiento_id), user_id, es_admin)


class VolverARedactar:
    """Repite solo la redacción (p. ej. tras poner nombres a los hablantes o completar datos del acta)."""

    def __init__(self, repo: RepositorioProcesamientos, al_encolar: Callable[[], None]):
        self.repo = repo
        self.al_encolar = al_encolar

    def ejecutar(self, procesamiento_id: int, user_id: int, es_admin: bool,
                 nombres_hablantes: Optional[Dict[str, str]] = None,
                 contexto: Optional[Dict[str, Any]] = None) -> Procesamiento:
        p = _verificar_dueno(self.repo.obtener(procesamiento_id), user_id, es_admin)
        if p.estado not in Estado.TERMINALES:
            raise ErrorDeValidacion('Espera a que termine el procesamiento actual.')
        if not p.tiene_transcripcion:
            raise ErrorDeValidacion('Aún no hay transcripción para redactar.')
        if isinstance(nombres_hablantes, dict):
            p.nombres_hablantes = {str(k)[:80]: str(v).strip()[:120] for k, v in nombres_hablantes.items() if str(v).strip()}
        if contexto is not None:
            num = p.contexto.get('num_hablantes')
            p.contexto = limpiar_contexto(contexto)
            if num:
                p.contexto['num_hablantes'] = num
        p.estado, p.progreso, p.mensaje = Estado.EN_COLA, 0, 'En cola para volver a redactar'
        p = self.repo.guardar(p)
        self.al_encolar()
        return p


class EliminarProcesamiento:
    """Si se está procesando, se pide cancelar: el trabajador se detiene en su siguiente reporte de avance y limpia."""

    def __init__(self, repo: RepositorioProcesamientos, almacen: AlmacenAudios):
        self.repo = repo
        self.almacen = almacen

    def ejecutar(self, procesamiento_id: int, user_id: int, es_admin: bool) -> None:
        p = _verificar_dueno(self.repo.obtener(procesamiento_id), user_id, es_admin)
        if p.estado in Estado.EJECUTANDO:
            self.repo.marcar_cancelado(p.id)
            return
        eliminar_con_archivos(self.repo, self.almacen, p)


def eliminar_con_archivos(repo: RepositorioProcesamientos, almacen: AlmacenAudios, p: Procesamiento) -> None:
    for parte in p.lista_partes():
        if parte.ruta:
            almacen.eliminar(parte.ruta)
    repo.eliminar(p.id)


class EjecutarProcesamiento:
    """Transcribe → identifica hablantes → redacta. Cada etapa ya hecha se salta al reintentar."""

    def __init__(self, repo: RepositorioProcesamientos, almacen: AlmacenAudios,
                 transcriptor: Callable[[], Transcriptor],
                 identificador: Callable[[], Optional[IdentificadorHablantes]],
                 modelo: Callable[[], ModeloLenguaje],
                 conservar_audio: bool = False):
        self.repo = repo
        self.almacen = almacen
        self.transcriptor = transcriptor
        self.identificador = identificador
        self.modelo = modelo
        self.conservar_audio = conservar_audio

    def _reportador(self, p: Procesamiento, estado: str, desde: float, hasta: float):
        ultimo = {'valor': -1}

        def reportar(fraccion: float, mensaje: str = ''):
            valor = int(desde + (hasta - desde) * max(0.0, min(1.0, fraccion)))
            if valor != ultimo['valor'] or mensaje:
                ultimo['valor'] = valor
                # Si se pidió cancelar, esto lanza ProcesamientoCancelado y detiene la etapa.
                self.repo.actualizar_avance(p.id, estado, valor, mensaje)
        return reportar

    def ejecutar(self, p: Procesamiento) -> Optional[Procesamiento]:
        try:
            return self._ejecutar(p)
        except ProcesamientoCancelado:
            log.info('Procesamiento %s cancelado por la persona', p.id)
            eliminar_con_archivos(self.repo, self.almacen, p)
            return None

    def _ejecutar(self, p: Procesamiento) -> Procesamiento:
        # Redactar con la IA local es la etapa más larga: si además hubo que transcribir audio,
        # la transcripción ocupa la primera parte de la barra; si no, la redacción la ocupa toda.
        transcribe_audio = not p.tiene_transcripcion and not p.es_texto
        inicio_redaccion = FIN_HABLANTES if transcribe_audio else 0
        try:
            if not p.tiene_transcripcion:
                self._transcribir(p)
        except ProcesamientoCancelado:
            raise
        except Exception as e:  # noqa: BLE001 — cualquier fallo se informa al usuario
            log.exception('Fallo transcribiendo %s', p.id)
            p.estado, p.mensaje = Estado.ERROR, f'No se pudo transcribir el audio: {e}'
            return self.repo.guardar(p)

        try:
            modelo = self.modelo()
            p.estado, p.progreso, p.mensaje = Estado.REDACTANDO, inicio_redaccion, f'Redactando con {modelo.nombre}'
            p = self.repo.guardar(p)
            reportar = self._reportador(p, Estado.REDACTANDO, inicio_redaccion, 99)
            segmentos = [Segmento.desde_dict(s) for s in p.segmentos]
            p.propuesta = GenerarPropuestaActa(modelo).ejecutar(
                segmentos, p.contexto, p.nombres_hablantes, avance=lambda f, m='': reportar(f, m),
                con_tiempos=not p.es_texto)
            p.proveedor_redaccion = modelo.nombre
            p.estado, p.progreso, p.mensaje = Estado.LISTO, 100, 'Propuesta lista para revisar'
        except ProcesamientoCancelado:
            raise
        except Exception as e:  # noqa: BLE001
            log.exception('Fallo redactando %s', p.id)
            p.estado = Estado.ERROR
            p.mensaje = f'La transcripción está lista, pero falló la redacción automática: {e}'
        return self.repo.guardar(p)

    def _transcribir(self, p: Procesamiento) -> None:
        partes = p.lista_partes()
        if p.es_texto:
            segmentos: List[Segmento] = []
            for i, parte in enumerate(partes):
                segmentos += segmentos_desde_texto(parte.texto, i, len(partes), desde=len(segmentos))
                parte.texto = ''
            if not segmentos:
                raise ValueError('La transcripción está vacía.')
            p.segmentos = [s.a_dict() for s in segmentos]
            p.guardar_partes(partes)
            self.repo.guardar(p)
            return

        p.estado, p.progreso, p.mensaje = Estado.TRANSCRIBIENDO, 0, 'Transcribiendo el audio'
        self.repo.guardar(p)
        transcriptor = self.transcriptor()
        segmentos, desfase = [], 0.0
        for i, parte in enumerate(partes):
            if len(partes) > 1:
                self.repo.actualizar_avance(p.id, Estado.TRANSCRIBIENDO, int(FIN_TRANSCRIPCION * i / len(partes)),
                                            f'Transcribiendo la parte {i + 1} de {len(partes)}')
            reportar = self._reportador(p, Estado.TRANSCRIBIENDO, FIN_TRANSCRIPCION * i / len(partes), FIN_TRANSCRIPCION * (i + 1) / len(partes))
            propios, duracion = transcriptor.transcribir(parte.ruta, reportar)
            # Los tiempos de cada parte continúan donde terminó la anterior.
            segmentos += [Segmento(s.inicio + desfase, s.fin + desfase, s.texto, None, i) for s in propios]
            desfase += duracion
        if not segmentos:
            raise ValueError('No se detectó voz en la grabación.')

        identificador = self.identificador()
        if identificador:
            p.estado, p.progreso, p.mensaje = Estado.IDENTIFICANDO_HABLANTES, FIN_TRANSCRIPCION, 'Identificando quién habla'
            self.repo.guardar(p)
            try:
                turnos = identificador.identificar(
                    [parte.ruta for parte in partes],
                    self._reportador(p, Estado.IDENTIFICANDO_HABLANTES, FIN_TRANSCRIPCION, FIN_HABLANTES - 1),
                    p.contexto.get('num_hablantes'))
                segmentos = asignar_hablantes(segmentos, renumerar_hablantes(turnos))
            except ProcesamientoCancelado:
                raise
            except Exception:  # noqa: BLE001 — la transcripción sigue siendo útil sin hablantes
                log.exception('Fallo identificando hablantes en %s', p.id)

        p.segmentos = [s.a_dict() for s in segmentos]
        p.duracion_segundos = desfase
        if not self.conservar_audio:
            for parte in partes:
                self.almacen.eliminar(parte.ruta)
                parte.ruta = ''
            p.guardar_partes(partes)
        self.repo.guardar(p)
