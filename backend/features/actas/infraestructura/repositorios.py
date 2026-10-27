from typing import List, Optional
from .models import ActaReunion, FirmaUsuario
from ..dominio.entidades import ActaReunionEntidad, FirmaUsuarioEntidad, extraer_participantes_ids
from ..dominio.puertos import RepositorioActas, RepositorioFirmas


class DjangoActasRepository(RepositorioActas):
    def _to_entity(self, model: ActaReunion) -> ActaReunionEntidad:
        return ActaReunionEntidad(
            id=model.id,
            data=model.data or {},
            creador_id=model.creador_id,
            participantes_ids=model.participantes_ids or []
        )

    def listar_por_usuario(self, user_id: int, es_admin: bool = False) -> List[ActaReunionEntidad]:
        if es_admin:
            qs = ActaReunion.objects.all()
        else:
            qs = ActaReunion.objects.filter(creador_id=user_id)
        return [self._to_entity(m) for m in qs]

    def listar_mis_actas(self, user_id: int) -> List[ActaReunionEntidad]:
        uid_str = str(user_id)
        resultado = []
        for m in ActaReunion.objects.all():
            entidad = self._to_entity(m)
            if entidad.pertenece_a_usuario(int(uid_str)):
                resultado.append(entidad)
        return resultado

    def obtener_por_id(self, acta_id: int) -> Optional[ActaReunionEntidad]:
        try:
            m = ActaReunion.objects.get(pk=acta_id)
            return self._to_entity(m)
        except ActaReunion.DoesNotExist:
            return None

    def guardar(self, acta: ActaReunionEntidad) -> ActaReunionEntidad:
        pids = acta.participantes_ids or extraer_participantes_ids(acta.data)
        if acta.creador_id and acta.creador_id not in pids:
            pids.append(acta.creador_id)

        if acta.id:
            m = ActaReunion.objects.get(pk=acta.id)
            m.data = acta.data
            m.participantes_ids = pids
            m.save()
        else:
            m = ActaReunion.objects.create(
                data=acta.data,
                creador_id=acta.creador_id,
                participantes_ids=pids
            )
        return self._to_entity(m)

    def eliminar(self, acta_id: int) -> bool:
        deleted, _ = ActaReunion.objects.filter(pk=acta_id).delete()
        return deleted > 0


class DjangoFirmasRepository(RepositorioFirmas):
    def obtener_por_usuario(self, user_id: int) -> Optional[FirmaUsuarioEntidad]:
        try:
            f = FirmaUsuario.objects.get(user_id=user_id)
            return FirmaUsuarioEntidad(id=f.id, user_id=f.user_id, firma_data=f.firma_data)
        except FirmaUsuario.DoesNotExist:
            return None

    def guardar_o_actualizar(self, firma: FirmaUsuarioEntidad) -> FirmaUsuarioEntidad:
        f, _ = FirmaUsuario.objects.update_or_create(
            user_id=firma.user_id,
            defaults={'firma_data': firma.firma_data}
        )
        return FirmaUsuarioEntidad(id=f.id, user_id=f.user_id, firma_data=f.firma_data)
