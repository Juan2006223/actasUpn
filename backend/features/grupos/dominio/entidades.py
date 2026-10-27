from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import date


@dataclass
class GrupoEntidad:
    id: Optional[int]
    name: str
    date: date
    description: str = ""
    features: str = ""
    advisor_id: Optional[int] = None
    advisor_name: str = ""
    integrantes: List[Dict[str, Any]] = field(default_factory=list)

    def __post_init__(self):
        if not self.name or not self.name.strip():
            raise ValueError("El nombre del grupo no puede estar vacío.")
        if not self.date:
            raise ValueError("La fecha del grupo es obligatoria.")

    def pertenece_a_usuario(self, user_id: int, es_admin: bool = False) -> bool:
        if es_admin:
            return True
        uid = str(user_id)
        if str(self.advisor_id or '') == uid:
            return True
        return any(str(s.get('id') or '') == uid for s in (self.integrantes or []))

    def puede_ser_eliminado_por(self, user_id: int, es_admin: bool = False) -> bool:
        return es_admin or str(self.advisor_id or '') == str(user_id)
