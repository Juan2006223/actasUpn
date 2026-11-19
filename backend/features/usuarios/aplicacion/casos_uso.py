from typing import List, Dict, Any, Optional
from shared.dominio import ROLES_PLATAFORMA, REDACTOR
from ..dominio.entidades import UsuarioEntidad, EmailInstitucional, DocumentoIdentidad, DependenciaEntidad
from ..dominio.puertos import RepositorioUsuarios, RepositorioDependencias

ROLES_VALIDOS = set(ROLES_PLATAFORMA)
MAX_CARGO = 150


def _rol_valido(rol: Any) -> str:
    limpio = str(rol or '').strip().upper()
    if limpio not in ROLES_VALIDOS:
        raise ValueError(f"Rol no valido: {limpio or '(vacío)'}")
    return limpio


def _cargo_valido(cargo: Any) -> str:
    limpio = ' '.join(str(cargo or '').split())
    if len(limpio) > MAX_CARGO:
        raise ValueError('El cargo es demasiado largo.')
    return limpio


def _dependencia_valida(repo_dep: Optional[RepositorioDependencias], dependencia_id: Any) -> Optional[DependenciaEntidad]:
    if dependencia_id in (None, '', 0, '0'):
        return None
    if repo_dep is None:
        raise ValueError('No se pueden asignar dependencias.')
    try:
        dep = repo_dep.obtener(int(dependencia_id))
    except (TypeError, ValueError):
        dep = None
    if not dep:
        raise ValueError('La dependencia no existe.')
    return dep


class BuscarUsuariosUseCase:
    def __init__(self, repo: RepositorioUsuarios):
        self.repo = repo

    def ejecutar(self, termino: str, limite: int = 20) -> List[UsuarioEntidad]:
        termino_limpio = str(termino or "").strip()
        if len(termino_limpio) < 2:
            return []
        return self.repo.buscar_por_termino(termino_limpio, limite)


class ListarUsuariosUseCase:
    def __init__(self, repo: RepositorioUsuarios):
        self.repo = repo

    def ejecutar(self) -> List[UsuarioEntidad]:
        return self.repo.listar_todos()


class CambiarRolUsuarioUseCase:
    def __init__(self, repo: RepositorioUsuarios):
        self.repo = repo

    def ejecutar(self, user_id: int, nuevo_rol: str) -> UsuarioEntidad:
        rol = _rol_valido(nuevo_rol)
        usuario = self.repo.obtener_por_id(user_id)
        if not usuario:
            raise ValueError("Usuario no encontrado")
        usuario.role = rol
        return self.repo.guardar(usuario)


class ActualizarPerfilUsuarioUseCase:
    """El superadministrador ajusta rol, cargo y dependencia de una persona."""

    def __init__(self, repo: RepositorioUsuarios, repo_dep: RepositorioDependencias):
        self.repo = repo
        self.repo_dep = repo_dep

    def ejecutar(self, user_id: int, datos: Dict[str, Any], actor_id: Optional[int] = None) -> UsuarioEntidad:
        usuario = self.repo.obtener_por_id(user_id)
        if not usuario:
            raise ValueError("Usuario no encontrado")
        if 'role' in datos:
            rol = _rol_valido(datos['role'])
            if actor_id is not None and int(actor_id) == int(user_id) and rol != usuario.role:
                raise ValueError('No puedes cambiar tu propio rol.')
            usuario.role = rol
        if 'cargo' in datos:
            usuario.cargo = _cargo_valido(datos['cargo'])
        if 'dependencia_id' in datos:
            dep = _dependencia_valida(self.repo_dep, datos['dependencia_id'])
            usuario.dependencia_id = dep.id if dep else None
        for campo in ('first_name', 'last_name'):
            if campo in datos:
                setattr(usuario, campo, str(datos[campo] or '').strip()[:150])
        return self.repo.guardar(usuario)


class AlternarEstadoUsuarioUseCase:
    def __init__(self, repo: RepositorioUsuarios):
        self.repo = repo

    def ejecutar(self, user_id: int, actor_id: Optional[int] = None) -> UsuarioEntidad:
        if actor_id is not None and int(actor_id) == int(user_id):
            raise ValueError("No puedes desactivar tu propia cuenta en sesion")
        usuario = self.repo.obtener_por_id(user_id)
        if not usuario:
            raise ValueError("Usuario no encontrado")
        usuario.is_active = not usuario.is_active
        return self.repo.guardar(usuario)


class CrearUsuarioInstitucionalUseCase:
    def __init__(self, repo: RepositorioUsuarios, repo_dep: Optional[RepositorioDependencias] = None):
        self.repo = repo
        self.repo_dep = repo_dep

    def ejecutar(
        self,
        document_number: str,
        email: str,
        first_name: str = "",
        last_name: str = "",
        role: str = REDACTOR,
        password: Optional[str] = None,
        cargo: str = "",
        dependencia_id: Optional[int] = None,
    ) -> UsuarioEntidad:
        doc_vo = DocumentoIdentidad(document_number)
        email_vo = EmailInstitucional(email)
        rol_final = _rol_valido(role or REDACTOR)
        dep = _dependencia_valida(self.repo_dep, dependencia_id)

        existente = self.repo.obtener_por_documento_o_correo(doc_vo.valor, email_vo.valor)
        if existente:
            raise ValueError("Ya existe un usuario con ese documento o correo institucional")

        username_base = email_vo.valor.split("@")[0].strip() or doc_vo.valor
        entidad = UsuarioEntidad(
            id=None,
            username=username_base,
            email=email_vo.valor,
            first_name=str(first_name or "").strip(),
            last_name=str(last_name or "").strip(),
            role=rol_final,
            document_number=doc_vo.valor,
            is_active=True,
            cargo=_cargo_valido(cargo),
            dependencia_id=dep.id if dep else None,
        )
        clave_inicial = password or doc_vo.valor
        return self.repo.guardar(entidad, password=clave_inicial)


class ImportarUsuariosMasivoUseCase:
    def __init__(self, repo: RepositorioUsuarios, repo_dep: Optional[RepositorioDependencias] = None):
        self.repo = repo
        self.repo_dep = repo_dep
        self.crear_uc = CrearUsuarioInstitucionalUseCase(repo, repo_dep)

    def _dependencia_por_nombre(self, nombre: str) -> Optional[int]:
        """En la carga masiva la dependencia llega por nombre: si no existe se crea."""
        nombre = ' '.join(str(nombre or '').split())
        if not nombre or self.repo_dep is None:
            return None
        dep = self.repo_dep.obtener_por_nombre(nombre)
        if not dep:
            dep = self.repo_dep.guardar(DependenciaEntidad(id=None, nombre=nombre))
        return dep.id

    def ejecutar(self, registros: List[Dict[str, Any]]) -> Dict[str, Any]:
        detalles = []
        exitosos = 0
        omitidos = 0
        for item in registros:
            doc = str(item.get("document_number") or item.get("numeroDocumento") or "").strip()
            correo = str(item.get("email") or item.get("emailInstitucional") or "").strip()
            nombres = str(item.get("first_name") or item.get("nombres") or "").strip()
            apellidos = str(item.get("last_name") or item.get("apellidos") or "").strip()
            rol = str(item.get("role") or item.get("rol") or REDACTOR).strip().upper()
            cargo = str(item.get("cargo") or "").strip()
            try:
                dependencia_id = self._dependencia_por_nombre(item.get("dependencia") or "")
                self.crear_uc.ejecutar(
                    document_number=doc,
                    email=correo,
                    first_name=nombres,
                    last_name=apellidos,
                    role=rol,
                    cargo=cargo,
                    dependencia_id=dependencia_id,
                )
                exitosos += 1
                detalles.append({"numeroDocumento": doc or "S/D", "estado": "EXITOSO"})
            except ValueError as err:
                omitidos += 1
                detalles.append({"numeroDocumento": doc or "S/D", "estado": "OMITIDO", "motivo": str(err)})
        return {
            "totalProcesados": len(registros),
            "exitosos": exitosos,
            "omitidos": omitidos,
            "detalles": detalles,
        }


class GestionarDependenciasUseCase:
    def __init__(self, repo: RepositorioDependencias):
        self.repo = repo

    def listar(self, solo_activas: bool = False) -> List[DependenciaEntidad]:
        return self.repo.listar(solo_activas=solo_activas)

    def _nombre_libre(self, nombre: str, propia_id: Optional[int] = None) -> None:
        otra = self.repo.obtener_por_nombre(nombre)
        if otra and otra.id != propia_id:
            raise ValueError('Ya existe una dependencia con ese nombre.')

    def crear(self, nombre: str) -> DependenciaEntidad:
        dep = DependenciaEntidad(id=None, nombre=nombre)
        self._nombre_libre(dep.nombre)
        return self.repo.guardar(dep)

    def actualizar(self, dependencia_id: int, datos: Dict[str, Any]) -> DependenciaEntidad:
        dep = self.repo.obtener(dependencia_id)
        if not dep:
            raise LookupError('Dependencia no encontrada.')
        if 'nombre' in datos:
            nueva = DependenciaEntidad(id=dep.id, nombre=datos['nombre'], activa=dep.activa)
            self._nombre_libre(nueva.nombre, dep.id)
            dep.nombre = nueva.nombre
        if 'activa' in datos:
            dep.activa = bool(datos['activa'])
        return self.repo.guardar(dep)

    def eliminar(self, dependencia_id: int) -> bool:
        dep = self.repo.obtener(dependencia_id)
        if not dep:
            raise LookupError('Dependencia no encontrada.')
        if dep.num_usuarios:
            raise ValueError('La dependencia tiene usuarios asignados: desactívala en lugar de eliminarla.')
        return self.repo.eliminar(dependencia_id)
