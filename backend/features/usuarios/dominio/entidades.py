from dataclasses import dataclass
from typing import Optional

@dataclass(frozen=True)
class EmailInstitucional:
    valor: str

    def __post_init__(self):
        if not self.valor or "@" not in self.valor:
            raise ValueError(f"Email invalido: {self.valor}")

@dataclass(frozen=True)
class DocumentoIdentidad:
    valor: str

    def __post_init__(self):
        v = str(self.valor).strip()
        if not v:
            raise ValueError("Documento de identidad no puede ser vacio")

@dataclass
class UsuarioEntidad:
    id: Optional[int]
    username: str
    email: str
    first_name: str
    last_name: str
    role: str
    document_number: Optional[str] = None
    photo: Optional[str] = None
    is_active: bool = True
    cargo: str = ''
    dependencia_id: Optional[int] = None
    dependencia_nombre: str = ''

    @property
    def full_name(self) -> str:
        nombre = f"{self.first_name} {self.last_name}".strip()
        return nombre or self.username


@dataclass
class DependenciaEntidad:
    id: Optional[int]
    nombre: str
    activa: bool = True
    num_usuarios: int = 0

    def __post_init__(self):
        self.nombre = ' '.join(str(self.nombre or '').split())
        if not self.nombre:
            raise ValueError('El nombre de la dependencia es obligatorio.')
        if len(self.nombre) > 150:
            raise ValueError('El nombre de la dependencia es demasiado largo.')
