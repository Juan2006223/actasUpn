from abc import ABC, abstractmethod
from typing import Optional, List
from .entidades import UsuarioEntidad, DependenciaEntidad

class RepositorioUsuarios(ABC):
    @abstractmethod
    def obtener_por_id(self, user_id: int) -> Optional[UsuarioEntidad]:
        pass

    @abstractmethod
    def obtener_por_documento_o_correo(self, documento: str, email: str) -> Optional[UsuarioEntidad]:
        pass

    @abstractmethod
    def listar_todos(self) -> List[UsuarioEntidad]:
        pass

    @abstractmethod
    def buscar_por_termino(self, termino: str, limite: int = 20) -> List[UsuarioEntidad]:
        pass

    @abstractmethod
    def guardar(self, usuario: UsuarioEntidad, password: Optional[str] = None) -> UsuarioEntidad:
        pass


class RepositorioDependencias(ABC):
    @abstractmethod
    def listar(self, solo_activas: bool = False) -> List[DependenciaEntidad]:
        pass

    @abstractmethod
    def obtener(self, dependencia_id: int) -> Optional[DependenciaEntidad]:
        pass

    @abstractmethod
    def obtener_por_nombre(self, nombre: str) -> Optional[DependenciaEntidad]:
        pass

    @abstractmethod
    def guardar(self, dependencia: DependenciaEntidad) -> DependenciaEntidad:
        pass

    @abstractmethod
    def eliminar(self, dependencia_id: int) -> bool:
        pass
