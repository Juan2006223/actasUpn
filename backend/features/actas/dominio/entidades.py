import unicodedata
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from shared.dominio import ADMIN, REVISOR


class EstadoActa:
    """Flujo del acta. Revisar es opcional: quien redacta puede publicar directo para firmas."""
    BORRADOR = 'BORRADOR'
    EN_REVISION = 'EN_REVISION'
    PARA_FIRMA = 'PARA_FIRMA'
    TODOS = (BORRADOR, EN_REVISION, PARA_FIRMA)


MAX_OBSERVACION = 2000
MAX_FIRMA_BYTES = 500_000
CAMPOS_PERSONAS = ('asistentes', 'invitados')


@dataclass(frozen=True)
class Actor:
    """Quién hace la petición: lo que hace falta saber para decidir permisos."""
    id: int
    rol: str = ''
    dependencia_id: Optional[int] = None
    nombre: str = ''
    es_superuser: bool = False

    @property
    def es_admin(self) -> bool:
        return self.rol == ADMIN or self.es_superuser


def _ahora() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalizar_nombre(nombre: Any) -> str:
    texto = unicodedata.normalize('NFKD', str(nombre or '')).encode('ascii', 'ignore').decode()
    return ' '.join(texto.lower().split())


def _nombre_valido(nombre: Any) -> bool:
    limpio = str(nombre or '').strip()
    return bool(limpio) and limpio.upper() != 'N/A'


def _uid(valor: Any) -> Optional[int]:
    return int(valor) if valor is not None and str(valor).isdigit() else None


def extraer_participantes_ids(data: Dict[str, Any]) -> List[int]:
    ids = set()
    if not isinstance(data, dict):
        return []
    for key in ('participantes', 'asistentes', 'ausentes', 'invitados', 'firmas'):
        for p in (data.get(key) or []):
            uid = _uid(p.get('user_id')) if isinstance(p, dict) else None
            if uid is not None:
                ids.add(uid)
    for c in (data.get('compromisos') or []):
        uid = _uid(c.get('responsable_id')) if isinstance(c, dict) else None
        if uid is not None:
            ids.add(uid)
    return sorted(ids)


def firma_vacia(nombre: str, user_id: Optional[int]) -> Dict[str, Any]:
    return {'nombre': nombre, 'firma': '', 'user_id': user_id, 'firmado': False, 'fecha': ''}


def sincronizar_firmas(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Toda persona en asistentes o invitados debe aparecer en firmas, aunque se haya agregado
    después. Se compara por usuario y, si no hay usuario, por nombre (sin tildes ni mayúsculas).
    """
    firmas = [dict(f) for f in (data.get('firmas') or []) if isinstance(f, dict)]
    por_id = {_uid(f.get('user_id')): f for f in firmas if _uid(f.get('user_id')) is not None}
    por_nombre = {_normalizar_nombre(f.get('nombre')): f for f in firmas if f.get('nombre')}
    for campo in CAMPOS_PERSONAS:
        for persona in (data.get(campo) or []):
            if not isinstance(persona, dict) or not _nombre_valido(persona.get('nombre')):
                continue
            uid = _uid(persona.get('user_id'))
            nombre = str(persona['nombre']).strip()
            existente = por_id.get(uid) if uid is not None else None
            if existente is None:
                existente = por_nombre.get(_normalizar_nombre(nombre))
                if existente is not None and uid is not None:
                    if _uid(existente.get('user_id')) not in (None, uid):
                        existente = None  # mismo nombre, otra persona
                    else:
                        existente['user_id'] = uid
                        por_id[uid] = existente
            if existente is None:
                nueva = firma_vacia(nombre, uid)
                firmas.append(nueva)
                por_nombre[_normalizar_nombre(nombre)] = nueva
                if uid is not None:
                    por_id[uid] = nueva
    return firmas


@dataclass
class ActaReunionEntidad:
    id: Optional[int]
    data: Dict[str, Any]
    creador_id: Optional[int]
    participantes_ids: List[int] = field(default_factory=list)
    updated_at: Optional[datetime] = None
    estado: str = EstadoActa.BORRADOR
    dependencia_id: Optional[int] = None

    def __post_init__(self):
        if not isinstance(self.data, dict):
            raise ValueError("Los datos del acta deben ser un diccionario.")
        if self.estado not in EstadoActa.TODOS:
            raise ValueError(f"Estado de acta no válido: {self.estado}")
        self.recalcular_participantes()

    def recalcular_participantes(self) -> None:
        combinados = set(self.participantes_ids or [])
        combinados.update(extraer_participantes_ids(self.data))
        if self.creador_id:
            combinados.add(int(self.creador_id))
        self.participantes_ids = sorted(int(x) for x in combinados if str(x).isdigit())

    # ── Quién es quién ────────────────────────────────────────

    def es_creador(self, actor: Actor) -> bool:
        return bool(self.creador_id) and str(self.creador_id) == str(actor.id)

    def es_participante(self, actor: Actor) -> bool:
        return any(str(pid) == str(actor.id) for pid in (self.participantes_ids or []))

    def es_revisor_de(self, actor: Actor) -> bool:
        return (actor.rol == REVISOR and self.dependencia_id is not None
                and actor.dependencia_id is not None and int(actor.dependencia_id) == int(self.dependencia_id))

    def pertenece_a_usuario(self, user_id: int) -> bool:
        return self.es_creador(Actor(user_id)) or self.es_participante(Actor(user_id))

    def mi_firma(self, actor: Actor) -> Optional[Dict[str, Any]]:
        return next((f for f in self.data.get('firmas') or []
                     if isinstance(f, dict) and str(f.get('user_id')) == str(actor.id)), None)

    # ── Permisos ──────────────────────────────────────────────

    def puede_consultar(self, actor: Actor) -> bool:
        return actor.es_admin or self.es_creador(actor) or self.es_participante(actor) or self.es_revisor_de(actor)

    def puede_editar(self, actor: Actor) -> bool:
        if self.estado == EstadoActa.PARA_FIRMA:
            return False  # primero hay que reabrirla, para no cambiar un texto que ya se está firmando
        return actor.es_admin or self.es_creador(actor) or self.es_revisor_de(actor)

    def puede_eliminar(self, actor: Actor) -> bool:
        if actor.es_admin:
            return True
        return self.es_creador(actor) and not any(f.get('firmado') for f in self.data.get('firmas') or [])

    def puede_firmar(self, actor: Actor) -> bool:
        firma = self.mi_firma(actor)
        return self.estado == EstadoActa.PARA_FIRMA and firma is not None and not firma.get('firmado')

    def puede_comentar(self, actor: Actor) -> bool:
        return self.puede_consultar(actor)

    def transiciones_para(self, actor: Actor) -> List[str]:
        gestor = actor.es_admin or self.es_creador(actor) or self.es_revisor_de(actor)
        if self.estado == EstadoActa.BORRADOR:
            destinos = []
            if actor.es_admin or self.es_creador(actor):
                destinos.append(EstadoActa.EN_REVISION)
            if gestor:
                destinos.append(EstadoActa.PARA_FIRMA)
            return destinos
        if self.estado == EstadoActa.EN_REVISION:
            destinos = [EstadoActa.BORRADOR] if gestor else []
            if actor.es_admin or self.es_revisor_de(actor):
                destinos.append(EstadoActa.PARA_FIRMA)
            return destinos
        return [EstadoActa.BORRADOR] if gestor else []

    def permisos(self, actor: Actor) -> Dict[str, Any]:
        return {
            'editar': self.puede_editar(actor),
            'eliminar': self.puede_eliminar(actor),
            'firmar': self.puede_firmar(actor),
            'comentar': self.puede_comentar(actor),
            'revisar': self.es_revisor_de(actor) or actor.es_admin,
            'transiciones': self.transiciones_para(actor),
        }

    # ── Cambios ───────────────────────────────────────────────

    def agregar_observacion(self, actor: Actor, texto: str, tipo: str = 'observacion') -> Dict[str, Any]:
        texto = str(texto or '').strip()
        if not texto:
            raise ValueError('La observación está vacía.')
        if len(texto) > MAX_OBSERVACION:
            raise ValueError(f'La observación supera los {MAX_OBSERVACION} caracteres.')
        nueva = {
            'id': uuid.uuid4().hex, 'autor_id': actor.id, 'autor': actor.nombre or f'Usuario {actor.id}',
            'texto': texto, 'fecha': _ahora(), 'tipo': tipo,
        }
        self.data['comentarios'] = [*(self.data.get('comentarios') or []), nueva]
        return nueva

    def firmar(self, actor: Actor, firma_data: str) -> None:
        if not self.puede_firmar(actor):
            if self.estado != EstadoActa.PARA_FIRMA:
                raise PermissionError('El acta todavía no está publicada para firmas.')
            if self.mi_firma(actor) is None:
                raise PermissionError('No figuras como firmante de esta acta.')
            raise PermissionError('Ya firmaste esta acta.')
        firma_data = str(firma_data or '').strip()
        if not firma_data.startswith('data:image/'):
            raise ValueError('La firma debe ser una imagen.')
        if len(firma_data) > MAX_FIRMA_BYTES:
            raise ValueError('La imagen de la firma es demasiado grande.')
        firma = self.mi_firma(actor)
        firma.update({'firma': firma_data, 'firmado': True, 'fecha': _ahora()})

    def cambiar_estado(self, actor: Actor, destino: str, motivo: str = '') -> None:
        if destino not in self.transiciones_para(actor):
            raise PermissionError('No puedes hacer ese cambio de estado en esta acta.')
        anterior = self.estado
        motivo = str(motivo or '').strip()
        if anterior == EstadoActa.PARA_FIRMA and destino == EstadoActa.BORRADOR:
            hubo_firmas = any(f.get('firmado') for f in self.data.get('firmas') or [])
            self.data['firmas'] = [firma_vacia(f.get('nombre', ''), _uid(f.get('user_id')))
                                   for f in self.data.get('firmas') or [] if isinstance(f, dict)]
            aviso = 'Acta reabierta para corregir.' + (' Las firmas registradas se anularon.' if hubo_firmas else '')
            self.agregar_observacion(actor, f'{aviso} {motivo}'.strip(), tipo='sistema')
        elif anterior == EstadoActa.EN_REVISION and destino == EstadoActa.BORRADOR and not self.es_creador(actor):
            self.agregar_observacion(actor, motivo or 'El revisor devolvió el acta para ajustes.', tipo='devolucion')
        elif motivo:
            self.agregar_observacion(actor, motivo)
        if destino == EstadoActa.PARA_FIRMA:
            self.data['firmas'] = sincronizar_firmas(self.data)
        self.estado = destino
        self.data['borrador'] = destino == EstadoActa.BORRADOR

    def reemplazar_contenido(self, nuevo: Dict[str, Any]) -> None:
        """
        Lo que envía el formulario reemplaza el contenido, pero las observaciones y las firmas
        las maneja solo el servidor: así un autoguardado no borra una observación recién enviada
        ni alguien se marca como firmado editando el acta.
        """
        anteriores = {(_uid(f.get('user_id')), _normalizar_nombre(f.get('nombre'))): f
                      for f in self.data.get('firmas') or [] if isinstance(f, dict)}
        firmas = []
        for f in nuevo.get('firmas') or []:
            if not isinstance(f, dict) or not _nombre_valido(f.get('nombre')):
                continue
            clave = (_uid(f.get('user_id')), _normalizar_nombre(f.get('nombre')))
            previa = anteriores.get(clave)
            firmas.append(dict(previa) if previa else firma_vacia(str(f['nombre']).strip(), clave[0]))
        datos = {**nuevo, 'firmas': firmas, 'comentarios': self.data.get('comentarios') or [],
                 'borrador': self.estado == EstadoActa.BORRADOR}
        datos['firmas'] = sincronizar_firmas(datos)
        self.data = datos
        self.recalcular_participantes()


@dataclass
class FirmaUsuarioEntidad:
    id: Optional[int]
    user_id: int
    firma_data: str

    def __post_init__(self):
        if not self.user_id:
            raise ValueError("El user_id es obligatorio para la firma.")
        if not self.firma_data or not self.firma_data.strip():
            raise ValueError("La firma no puede estar vacía.")
