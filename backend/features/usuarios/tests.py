import unittest
from .dominio.entidades import EmailInstitucional, DocumentoIdentidad, UsuarioEntidad, DependenciaEntidad
from .dominio.puertos import RepositorioUsuarios, RepositorioDependencias
from .aplicacion.casos_uso import (
    ActualizarPerfilUsuarioUseCase,
    GestionarDependenciasUseCase,
    ImportarUsuariosMasivoUseCase,
    BuscarUsuariosUseCase,
    CambiarRolUsuarioUseCase,
    AlternarEstadoUsuarioUseCase,
    CrearUsuarioInstitucionalUseCase,
)

class InMemoryUsuarioRepo(RepositorioUsuarios):
    def __init__(self):
        self.usuarios = []
        self._next_id = 1

    def obtener_por_id(self, user_id: int):
        for u in self.usuarios:
            if u.id == user_id:
                return u
        return None

    def obtener_por_documento_o_correo(self, documento: str, email: str):
        for u in self.usuarios:
            if u.document_number == documento or u.email.lower() == email.lower():
                return u
        return None

    def listar_todos(self):
        return list(self.usuarios)

    def buscar_por_termino(self, termino: str, limite: int = 20):
        q = termino.lower()
        res = [
            u for u in self.usuarios
            if q in u.username.lower()
            or q in u.first_name.lower()
            or q in u.last_name.lower()
            or (u.document_number and q in u.document_number.lower())
        ]
        return res[:limite]

    def guardar(self, usuario: UsuarioEntidad, password=None):
        if usuario.id is None:
            usuario.id = self._next_id
            self._next_id += 1
            self.usuarios.append(usuario)
        return usuario

class InMemoryDependenciaRepo(RepositorioDependencias):
    def __init__(self):
        self.deps = {}

    def listar(self, solo_activas=False):
        return [d for d in self.deps.values() if d.activa or not solo_activas]

    def obtener(self, dependencia_id):
        return self.deps.get(dependencia_id)

    def obtener_por_nombre(self, nombre):
        return next((d for d in self.deps.values() if d.nombre.lower() == nombre.strip().lower()), None)

    def guardar(self, dep):
        if dep.id is None:
            dep.id = len(self.deps) + 1
        self.deps[dep.id] = dep
        return dep

    def eliminar(self, dependencia_id):
        return self.deps.pop(dependencia_id, None) is not None


class TestUsuariosDomainAndApp(unittest.TestCase):
    def setUp(self):
        self.repo = InMemoryUsuarioRepo()
        self.buscar_uc = BuscarUsuariosUseCase(self.repo)
        self.cambiar_rol_uc = CambiarRolUsuarioUseCase(self.repo)
        self.alternar_estado_uc = AlternarEstadoUsuarioUseCase(self.repo)
        self.crear_uc = CrearUsuarioInstitucionalUseCase(self.repo)
        self.u1 = self.repo.guardar(UsuarioEntidad(
            id=None, username="jdoe", email="jdoe@upn.edu.co",
            first_name="Juan", last_name="Perez", role="REDACTOR", document_number="102030"
        ))

    def test_value_objects_validos_e_invalidos(self):
        email = EmailInstitucional("docente@upn.edu.co")
        self.assertEqual(email.valor, "docente@upn.edu.co")
        with self.assertRaises(ValueError):
            EmailInstitucional("correo_invalido")
        with self.assertRaises(ValueError):
            DocumentoIdentidad("   ")

    def test_busqueda_usuarios_caso_uso(self):
        self.assertEqual(len(self.buscar_uc.ejecutar("a")), 0)
        res = self.buscar_uc.ejecutar("Juan")
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0].full_name, "Juan Perez")

    def test_cambiar_rol_y_alternar_estado(self):
        actualizado = self.cambiar_rol_uc.ejecutar(self.u1.id, "ADMIN")
        self.assertEqual(actualizado.role, "ADMIN")
        with self.assertRaises(ValueError):
            self.cambiar_rol_uc.ejecutar(self.u1.id, "ROL_INVALIDO")
        with self.assertRaises(ValueError):
            self.alternar_estado_uc.ejecutar(self.u1.id, actor_id=self.u1.id)
        inactivo = self.alternar_estado_uc.ejecutar(self.u1.id, actor_id=999)
        self.assertFalse(inactivo.is_active)

    def test_crear_usuario_institucional(self):
        nuevo = self.crear_uc.ejecutar(
            document_number="8090100",
            email="nuevo@upn.edu.co",
            first_name="Maria",
            last_name="Gomez",
            role="REDACTOR",
        )
        self.assertEqual(nuevo.username, "nuevo")
        self.assertEqual(nuevo.role, "REDACTOR")
        with self.assertRaises(ValueError):
            self.crear_uc.ejecutar(document_number="8090100", email="otro@upn.edu.co")

    def test_roles_viejos_ya_no_son_validos(self):
        with self.assertRaises(ValueError):
            self.cambiar_rol_uc.ejecutar(self.u1.id, "TEACHER")


class TestCargoYDependencia(unittest.TestCase):
    def setUp(self):
        self.repo = InMemoryUsuarioRepo()
        self.deps = InMemoryDependenciaRepo()
        self.gestion = GestionarDependenciasUseCase(self.deps)
        self.cinndet = self.gestion.crear('  CINNDET ')

    def test_dependencias_sin_duplicados_y_no_se_borran_con_usuarios(self):
        self.assertEqual(self.cinndet.nombre, 'CINNDET')
        with self.assertRaises(ValueError):
            self.gestion.crear('cinndet')
        with self.assertRaises(ValueError):
            DependenciaEntidad(id=None, nombre='   ')
        self.cinndet.num_usuarios = 2
        with self.assertRaises(ValueError):
            self.gestion.eliminar(self.cinndet.id)
        self.assertFalse(self.gestion.actualizar(self.cinndet.id, {'activa': False}).activa)

    def test_crear_con_cargo_y_dependencia(self):
        crear = CrearUsuarioInstitucionalUseCase(self.repo, self.deps)
        u = crear.ejecutar('123', 'carlos@upn.edu.co', 'Carlos', 'Merchán', 'REVISOR', cargo=' Director ',
                           dependencia_id=self.cinndet.id)
        self.assertEqual((u.role, u.cargo, u.dependencia_id), ('REVISOR', 'Director', self.cinndet.id))
        with self.assertRaises(ValueError):
            crear.ejecutar('456', 'x@upn.edu.co', dependencia_id=999)

    def test_actualizar_perfil_y_no_cambiar_su_propio_rol(self):
        u = CrearUsuarioInstitucionalUseCase(self.repo, self.deps).ejecutar('123', 'a@upn.edu.co')
        perfil = ActualizarPerfilUsuarioUseCase(self.repo, self.deps)
        actualizado = perfil.ejecutar(u.id, {'cargo': 'Diseñador', 'dependencia_id': self.cinndet.id})
        self.assertEqual((actualizado.cargo, actualizado.dependencia_id), ('Diseñador', self.cinndet.id))
        self.assertIsNone(perfil.ejecutar(u.id, {'dependencia_id': ''}).dependencia_id)
        with self.assertRaises(ValueError):
            perfil.ejecutar(u.id, {'role': 'ADMIN'}, actor_id=u.id)

    def test_carga_masiva_crea_la_dependencia_por_nombre(self):
        res = ImportarUsuariosMasivoUseCase(self.repo, self.deps).ejecutar([
            {'document_number': '1', 'email': 'a@upn.edu.co', 'cargo': 'Docente', 'dependencia': 'Facultad de Ciencias'},
            {'document_number': '2', 'email': 'b@upn.edu.co', 'dependencia': 'cinndet'},
        ])
        self.assertEqual(res['exitosos'], 2)
        self.assertIsNotNone(self.deps.obtener_por_nombre('Facultad de Ciencias'))
        self.assertEqual(self.repo.usuarios[1].dependencia_id, self.cinndet.id)


from django.contrib.auth import get_user_model  # noqa: E402
from django.test import TestCase  # noqa: E402
from rest_framework.test import APIClient  # noqa: E402
from rest_framework_simplejwt.tokens import RefreshToken  # noqa: E402


class RenovarSesionApiTests(TestCase):
    def test_renueva_la_sesion_con_el_token_de_renovacion(self):
        user = get_user_model().objects.create_user(username='doc', password='x', role='REDACTOR')
        refresh = RefreshToken.for_user(user)
        client = APIClient()
        r = client.post('/api/auth/refresh/', {'refresh': str(refresh)}, format='json')
        self.assertEqual(r.status_code, 200)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
        self.assertEqual(client.get('/api/auth/me/').status_code, 200)

    def test_token_de_renovacion_invalido_se_rechaza(self):
        r = APIClient().post('/api/auth/refresh/', {'refresh': 'no-es-un-token'}, format='json')
        self.assertEqual(r.status_code, 401)
