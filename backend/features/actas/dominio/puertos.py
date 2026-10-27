from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from .entidades import ActaReunionEntidad, FirmaUsuarioEntidad

class RepositorioActas(ABC):
    @abstractmethod
    def listar_por_usuario(self, user_id: int, es_admin: bool = False) -> List[ActaReunionEntidad]:
        pass

    @abstractmethod
    def listar_mis_actas(self, user_id: int) -> List[ActaReunionEntidad]:
        pass

    @abstractmethod
    def obtener_por_id(self, acta_id: int) -> Optional[ActaReunionEntidad]:
        pass

    @abstractmethod
    def guardar(self, acta: ActaReunionEntidad) -> ActaReunionEntidad:
        pass

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
