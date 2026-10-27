from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from .entidades import GrupoEntidad


class RepositorioGrupos(ABC):
    @abstractmethod
    def listar_todos(self) -> List[GrupoEntidad]:
        pass

    @abstractmethod
    def obtener_por_id(self, grupo_id: int) -> Optional[GrupoEntidad]:
        pass

    @abstractmethod
    def guardar(self, grupo: GrupoEntidad) -> GrupoEntidad:
        pass

    @abstractmethod
    def eliminar(self, grupo_id: int) -> bool:
        pass

    @abstractmethod
    def listar_estudiantes_activos(self) -> List[Dict[str, Any]]:
        pass

    def obtener_integrantes_grupo(self, grupo: GrupoEntidad) -> List[Dict[str, Any]]:
        return grupo.integrantes if grupo.integrantes else self.listar_estudiantes_activos()
