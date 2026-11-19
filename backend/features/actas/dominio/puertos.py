from abc import ABC, abstractmethod
from typing import Callable, List, Optional, TypeVar
from .entidades import ActaReunionEntidad, FirmaUsuarioEntidad, Actor

T = TypeVar('T')


class RepositorioActas(ABC):
    @abstractmethod
    def listar_visibles(self, actor: Actor) -> List[ActaReunionEntidad]:
        """Las actas que el actor puede consultar."""

    @abstractmethod
    def listar_mis_actas(self, user_id: int) -> List[ActaReunionEntidad]:
        """Las actas que creó o en las que participa."""

    @abstractmethod
    def obtener_por_id(self, acta_id: int) -> Optional[ActaReunionEntidad]:
        pass

    @abstractmethod
    def crear(self, acta: ActaReunionEntidad) -> ActaReunionEntidad:
        pass

    @abstractmethod
    def modificar(self, acta_id: int, cambio: Callable[[ActaReunionEntidad], T]) -> ActaReunionEntidad:
        """
        Lee el acta bloqueándola, aplica `cambio` y la guarda en una sola transacción, para que
        dos personas firmando o comentando a la vez no se pisen. Lanza LookupError si no existe.
        """

    @abstractmethod
    def eliminar(self, acta_id: int) -> bool:
        pass


class RepositorioFirmas(ABC):
    @abstractmethod
    def obtener_por_usuario(self, user_id: int) -> Optional[FirmaUsuarioEntidad]:
        pass

    @abstractmethod
    def guardar_o_actualizar(self, firma: FirmaUsuarioEntidad) -> FirmaUsuarioEntidad:
        pass
