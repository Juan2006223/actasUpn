from typing import List, Dict, Any, Optional
from ..dominio.entidades import UsuarioEntidad, EmailInstitucional, DocumentoIdentidad
from ..dominio.puertos import RepositorioUsuarios

ROLES_VALIDOS = {
    'ADMIN',
    'SUPERVISOR',
    'COORDINADOR',
    'TEACHER',
    'APOYO',
    'ASISTENTE',
    'STUDENT',
}

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
        rol_limpio = str(nuevo_rol or "").strip().upper()
        if rol_limpio not in ROLES_VALIDOS:
            raise ValueError(f"Rol no valido: {rol_limpio}")
        usuario = self.repo.obtener_por_id(user_id)
        if not usuario:
            raise ValueError("Usuario no encontrado")
        usuario.role = rol_limpio
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
    def __init__(self, repo: RepositorioUsuarios):
        self.repo = repo

    def ejecutar(
        self,
        document_number: str,
        email: str,
        first_name: str = "",
        last_name: str = "",
        role: str = "TEACHER",
        password: Optional[str] = None,
    ) -> UsuarioEntidad:
        doc_vo = DocumentoIdentidad(document_number)
        email_vo = EmailInstitucional(email)
        rol_final = str(role or "TEACHER").strip().upper()
        if rol_final not in ROLES_VALIDOS:
            rol_final = "TEACHER"

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
        )
        clave_inicial = password or doc_vo.valor
        return self.repo.guardar(entidad, password=clave_inicial)

class ImportarUsuariosMasivoUseCase:
    def __init__(self, repo: RepositorioUsuarios):
        self.repo = repo
        self.crear_uc = CrearUsuarioInstitucionalUseCase(repo)

    def ejecutar(self, registros: List[Dict[str, Any]]) -> Dict[str, Any]:
        detalles = []
        exitosos = 0
        omitidos = 0
        for item in registros:
            doc = str(item.get("document_number") or item.get("numeroDocumento") or "").strip()
            correo = str(item.get("email") or item.get("emailInstitucional") or "").strip()
            nombres = str(item.get("first_name") or item.get("nombres") or "").strip()
            apellidos = str(item.get("last_name") or item.get("apellidos") or "").strip()
            rol = str(item.get("role") or item.get("rol") or "TEACHER").strip().upper()
            try:
                self.crear_uc.ejecutar(
                    document_number=doc,
                    email=correo,
                    first_name=nombres,
                    last_name=apellidos,
                    role=rol,
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
