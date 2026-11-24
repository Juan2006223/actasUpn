from typing import Dict, List, Optional, Set
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import ActaReunion, FirmaUsuario
from ..dominio.entidades import ActaReunionEntidad, FirmaUsuarioEntidad, Actor
from ..dominio.puertos import RepositorioActas, RepositorioFirmas


def nombres_de_dependencias(ids: Set[Optional[int]]) -> Dict[int, str]:
    ids = {i for i in ids if i}
    if not ids:
        return {}
    from features.usuarios.infraestructura.models import Dependencia
    return dict(Dependencia.objects.filter(pk__in=ids).values_list('id', 'nombre'))


def nombres_de_usuarios(ids: Set[Optional[int]]) -> Dict[int, str]:
    ids = {i for i in ids if i}
    if not ids:
        return {}
    User = get_user_model()
    return {u.id: (f'{u.first_name} {u.last_name}'.strip() or u.username)
            for u in User.objects.filter(pk__in=ids).only('id', 'first_name', 'last_name', 'username')}


class DjangoActasRepository(RepositorioActas):
    def _to_entity(self, model: ActaReunion) -> ActaReunionEntidad:
        return ActaReunionEntidad(
            id=model.id,
            data=model.data or {},
            creador_id=model.creador_id,
            participantes_ids=model.participantes_ids or [],
            updated_at=model.updated_at,
            estado=model.estado,
            dependencia_id=model.dependencia_id,
        )

    def listar_visibles(self, actor: Actor) -> List[ActaReunionEntidad]:
        if actor.es_admin:
            return [self._to_entity(m) for m in ActaReunion.objects.all()]
        # La participación vive en un JSON: se filtra en Python lo que no se puede filtrar en la consulta.
        actas = (self._to_entity(m) for m in ActaReunion.objects.all())
        return [a for a in actas if a.puede_consultar(actor)]

    def listar_mis_actas(self, user_id: int) -> List[ActaReunionEntidad]:
        actas = (self._to_entity(m) for m in ActaReunion.objects.all())
        return [a for a in actas if a.pertenece_a_usuario(user_id)]

    def obtener_por_id(self, acta_id: int) -> Optional[ActaReunionEntidad]:
        m = ActaReunion.objects.filter(pk=acta_id).first()
        return self._to_entity(m) if m else None

    def crear(self, acta: ActaReunionEntidad) -> ActaReunionEntidad:
        m = ActaReunion.objects.create(
            data=acta.data, creador_id=acta.creador_id, participantes_ids=acta.participantes_ids,
            estado=acta.estado, dependencia_id=acta.dependencia_id,
        )
        return self._to_entity(m)

    def modificar(self, acta_id: int, cambio) -> ActaReunionEntidad:
        with transaction.atomic():
            m = ActaReunion.objects.select_for_update().filter(pk=acta_id).first()
            if not m:
                raise LookupError('Acta no encontrada')
            acta = self._to_entity(m)
            cambio(acta)
            acta.recalcular_participantes()
            m.data = acta.data
            m.participantes_ids = acta.participantes_ids
            m.estado = acta.estado
            m.save()
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

    def eliminar_por_usuario(self, user_id: int) -> bool:
        borrados, _ = FirmaUsuario.objects.filter(user_id=user_id).delete()
        return borrados > 0
