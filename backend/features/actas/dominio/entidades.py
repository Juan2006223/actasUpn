from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any


def extraer_participantes_ids(data: Dict[str, Any]) -> List[int]:
    ids = set()
    if not isinstance(data, dict):
        return []
    for key in ('participantes', 'asistentes', 'ausentes', 'invitados', 'firmas'):
        for p in (data.get(key) or []):
            uid = p.get('user_id') if isinstance(p, dict) else None
            if uid is not None and str(uid).isdigit():
                ids.add(int(uid))
    for c in (data.get('compromisos') or []):
        uid = c.get('responsable_id') if isinstance(c, dict) else None
        if uid is not None and str(uid).isdigit():
            ids.add(int(uid))
    return sorted(ids)


@dataclass
class ActaReunionEntidad:
    id: Optional[int]
    data: Dict[str, Any]
    creador_id: Optional[int]
    participantes_ids: List[int] = field(default_factory=list)

    def __post_init__(self):
        if not isinstance(self.data, dict):
            raise ValueError("Los datos del acta deben ser un diccionario.")
        combinados = set(self.participantes_ids or [])
        combinados.update(extraer_participantes_ids(self.data))
        if self.creador_id:
            combinados.add(int(self.creador_id))
        self.participantes_ids = sorted(int(x) for x in combinados if str(x).isdigit())

    def pertenece_a_usuario(self, user_id: int) -> bool:
        uid_str = str(user_id)
        if self.creador_id and str(self.creador_id) == uid_str:
            return True
        return any(str(pid) == uid_str for pid in (self.participantes_ids or []))

    def puede_ser_consultada_por(self, user_id: int, es_admin: bool = False) -> bool:
        return bool(es_admin or self.pertenece_a_usuario(user_id))

    def puede_ser_actualizada_por(self, user_id: int, es_admin: bool = False) -> bool:
        return bool(es_admin or self.pertenece_a_usuario(user_id))

    def puede_ser_eliminada_por(self, user_id: int, es_admin: bool = False) -> bool:
        if es_admin:
            return True
        return bool(self.creador_id and str(self.creador_id) == str(user_id))


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
