import unittest
from .dominio.entidades import EmailInstitucional, DocumentoIdentidad, UsuarioEntidad
from .dominio.puertos import RepositorioUsuarios
from .aplicacion.casos_uso import (
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

class TestUsuariosDomainAndApp(unittest.TestCase):
    def setUp(self):
        self.repo = InMemoryUsuarioRepo()
        self.buscar_uc = BuscarUsuariosUseCase(self.repo)
        self.cambiar_rol_uc = CambiarRolUsuarioUseCase(self.repo)
        self.alternar_estado_uc = AlternarEstadoUsuarioUseCase(self.repo)
        self.crear_uc = CrearUsuarioInstitucionalUseCase(self.repo)
        self.u1 = self.repo.guardar(UsuarioEntidad(
            id=None, username="jdoe", email="jdoe@upn.edu.co",
            first_name="Juan", last_name="Perez", role="TEACHER", document_number="102030"
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
            role="TEACHER",
        )
        self.assertEqual(nuevo.username, "nuevo")
        self.assertEqual(nuevo.role, "TEACHER")
        with self.assertRaises(ValueError):
            self.crear_uc.ejecutar(document_number="8090100", email="otro@upn.edu.co")


from django.contrib.auth import get_user_model  # noqa: E402
from django.test import TestCase  # noqa: E402
from rest_framework.test import APIClient  # noqa: E402
from rest_framework_simplejwt.tokens import RefreshToken  # noqa: E402


class RenovarSesionApiTests(TestCase):
    def test_renueva_la_sesion_con_el_token_de_renovacion(self):
        user = get_user_model().objects.create_user(username='doc', password='x', role='TEACHER')
        refresh = RefreshToken.for_user(user)
        client = APIClient()
        r = client.post('/api/auth/refresh/', {'refresh': str(refresh)}, format='json')
        self.assertEqual(r.status_code, 200)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
        self.assertEqual(client.get('/api/auth/me/').status_code, 200)

    def test_token_de_renovacion_invalido_se_rechaza(self):
        r = APIClient().post('/api/auth/refresh/', {'refresh': 'no-es-un-token'}, format='json')
        self.assertEqual(r.status_code, 401)
