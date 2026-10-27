from typing import List, Optional, Dict, Any
from ..dominio.entidades import ActaReunionEntidad, FirmaUsuarioEntidad
from ..dominio.puertos import RepositorioActas, RepositorioFirmas


class ListarActasUseCase:
    def __init__(self, repo: RepositorioActas):
        self.repo = repo

    def ejecutar(self, user_id: int, es_admin: bool = False) -> List[ActaReunionEntidad]:
        return self.repo.listar_por_usuario(user_id, es_admin=es_admin)


class ListarMisActasUseCase:
    def __init__(self, repo: RepositorioActas):
        self.repo = repo

    def ejecutar(self, user_id: int) -> List[ActaReunionEntidad]:
        return self.repo.listar_mis_actas(user_id)


class ObtenerActaUseCase:
    def __init__(self, repo: RepositorioActas):
        self.repo = repo

    def ejecutar(self, acta_id: int, user_id: Optional[int] = None, es_admin: bool = False) -> Optional[ActaReunionEntidad]:
        acta = self.repo.obtener_por_id(acta_id)
        if not acta:
            return None
        if user_id is not None and not acta.puede_ser_consultada_por(user_id, es_admin=es_admin):
            raise PermissionError("No tienes permiso para consultar esta acta.")
        return acta


class GuardarActaUseCase:
    def __init__(self, repo: RepositorioActas):
        self.repo = repo

    def ejecutar(
        self,
        data: Dict[str, Any],
        creador_id: int,
        acta_id: Optional[int] = None,
        participantes_ids: Optional[List[int]] = None,
        actor_id: Optional[int] = None,
        es_admin: bool = False,
    ) -> ActaReunionEntidad:
        if acta_id is not None:
            existente = self.repo.obtener_por_id(acta_id)
            if not existente:
                raise LookupError("Acta no encontrada")
            actor_efectivo = actor_id if actor_id is not None else creador_id
            if actor_efectivo is not None and not existente.puede_ser_actualizada_por(actor_efectivo, es_admin=es_admin):
                raise PermissionError("No tienes permiso para modificar esta acta.")
            creador_id = existente.creador_id or creador_id

        entidad = ActaReunionEntidad(
            id=acta_id,
            data=data,
            creador_id=creador_id,
            participantes_ids=participantes_ids or []
        )
        return self.repo.guardar(entidad)


class EliminarActaUseCase:
    def __init__(self, repo: RepositorioActas):
        self.repo = repo

    def ejecutar(self, acta_id: int, user_id: int, es_admin: bool = False) -> bool:
        acta = self.repo.obtener_por_id(acta_id)
        if not acta:
            raise LookupError("Acta no encontrada")
        if not acta.puede_ser_eliminada_por(user_id, es_admin=es_admin):
            raise PermissionError("Solo el creador puede eliminar esta acta")
        return self.repo.eliminar(acta_id)


class GestionarFirmaUseCase:
    def __init__(self, repo: RepositorioFirmas):
        self.repo = repo

    def obtener_firma(self, user_id: int) -> Optional[str]:
        firma = self.repo.obtener_por_usuario(user_id)
        return firma.firma_data if firma else None

    def registrar_firma(self, user_id: int, firma_data: str) -> FirmaUsuarioEntidad:
        entidad = FirmaUsuarioEntidad(id=None, user_id=user_id, firma_data=firma_data)
        return self.repo.guardar_o_actualizar(entidad)
