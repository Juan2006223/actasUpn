from typing import List, Optional, Dict, Any
from ..dominio.entidades import ActaReunionEntidad, FirmaUsuarioEntidad, Actor, EstadoActa, sincronizar_firmas
from ..dominio.puertos import RepositorioActas, RepositorioFirmas


class ListarActasUseCase:
    def __init__(self, repo: RepositorioActas):
        self.repo = repo

    def ejecutar(self, actor: Actor) -> List[ActaReunionEntidad]:
        return self.repo.listar_visibles(actor)


class ListarMisActasUseCase:
    def __init__(self, repo: RepositorioActas):
        self.repo = repo

    def ejecutar(self, user_id: int) -> List[ActaReunionEntidad]:
        return self.repo.listar_mis_actas(user_id)


def _obtener_visible(repo: RepositorioActas, acta_id: int, actor: Actor) -> ActaReunionEntidad:
    acta = repo.obtener_por_id(acta_id)
    if not acta:
        raise LookupError('Acta no encontrada')
    if not acta.puede_consultar(actor):
        raise PermissionError('No tienes permiso para consultar esta acta.')
    return acta


class ObtenerActaUseCase:
    def __init__(self, repo: RepositorioActas):
        self.repo = repo

    def ejecutar(self, acta_id: int, actor: Actor) -> ActaReunionEntidad:
        return _obtener_visible(self.repo, acta_id, actor)


class CrearActaUseCase:
    def __init__(self, repo: RepositorioActas):
        self.repo = repo

    def ejecutar(self, data: Dict[str, Any], actor: Actor) -> ActaReunionEntidad:
        # El acta queda en la dependencia de quien la crea: así la ve su revisor.
        acta = ActaReunionEntidad(id=None, data={}, creador_id=actor.id, estado=EstadoActa.BORRADOR,
                                  dependencia_id=actor.dependencia_id)
        acta.reemplazar_contenido(data)
        return self.repo.crear(acta)


class EditarActaUseCase:
    def __init__(self, repo: RepositorioActas):
        self.repo = repo

    def ejecutar(self, acta_id: int, data: Dict[str, Any], actor: Actor) -> ActaReunionEntidad:
        def cambio(acta: ActaReunionEntidad):
            if not acta.puede_consultar(actor):
                raise PermissionError('No tienes permiso para consultar esta acta.')
            if not acta.puede_editar(actor):
                if acta.estado == EstadoActa.PARA_FIRMA:
                    raise PermissionError('El acta está publicada para firmas: reábrela para poder editarla.')
                raise PermissionError('Solo quien redactó el acta o el revisor de su dependencia pueden editarla.')
            acta.reemplazar_contenido(data)
        return self.repo.modificar(acta_id, cambio)


class EliminarActaUseCase:
    def __init__(self, repo: RepositorioActas):
        self.repo = repo

    def ejecutar(self, acta_id: int, actor: Actor) -> bool:
        acta = _obtener_visible(self.repo, acta_id, actor)
        if not acta.puede_eliminar(actor):
            raise PermissionError('Solo quien creó el acta puede eliminarla, y solo si nadie la ha firmado.')
        return self.repo.eliminar(acta_id)


class FirmarActaUseCase:
    def __init__(self, repo: RepositorioActas, firmas: RepositorioFirmas):
        self.repo = repo
        self.firmas = firmas

    def ejecutar(self, acta_id: int, actor: Actor, firma_data: Optional[str] = None) -> ActaReunionEntidad:
        if not firma_data:
            guardada = self.firmas.obtener_por_usuario(actor.id)
            if not guardada:
                raise ValueError('Primero configura tu firma personal o dibújala para esta acta.')
            firma_data = guardada.firma_data

        def cambio(acta: ActaReunionEntidad):
            if not acta.puede_consultar(actor):
                raise PermissionError('No tienes permiso para consultar esta acta.')
            # Por si alguien se agregó a asistentes en un acta guardada antes de este arreglo.
            acta.data['firmas'] = sincronizar_firmas(acta.data)
            acta.firmar(actor, firma_data)
        return self.repo.modificar(acta_id, cambio)


class AgregarObservacionUseCase:
    def __init__(self, repo: RepositorioActas):
        self.repo = repo

    def ejecutar(self, acta_id: int, actor: Actor, texto: str) -> ActaReunionEntidad:
        def cambio(acta: ActaReunionEntidad):
            if not acta.puede_comentar(actor):
                raise PermissionError('No tienes permiso para comentar esta acta.')
            acta.agregar_observacion(actor, texto)
        return self.repo.modificar(acta_id, cambio)


class CambiarEstadoActaUseCase:
    def __init__(self, repo: RepositorioActas):
        self.repo = repo

    def ejecutar(self, acta_id: int, actor: Actor, destino: str, motivo: str = '') -> ActaReunionEntidad:
        destino = str(destino or '').strip().upper()
        if destino not in EstadoActa.TODOS:
            raise ValueError('Estado no válido.')

        def cambio(acta: ActaReunionEntidad):
            if not acta.puede_consultar(actor):
                raise PermissionError('No tienes permiso para consultar esta acta.')
            acta.cambiar_estado(actor, destino, motivo)
        return self.repo.modificar(acta_id, cambio)


class GestionarFirmaUseCase:
    def __init__(self, repo: RepositorioFirmas):
        self.repo = repo

    def obtener_firma(self, user_id: int) -> Optional[str]:
        firma = self.repo.obtener_por_usuario(user_id)
        return firma.firma_data if firma else None

    def registrar_firma(self, user_id: int, firma_data: str) -> FirmaUsuarioEntidad:
        entidad = FirmaUsuarioEntidad(id=None, user_id=user_id, firma_data=firma_data)
        return self.repo.guardar_o_actualizar(entidad)
