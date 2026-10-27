import unittest
from datetime import date
from .dominio.entidades import GrupoEntidad
from .aplicacion.casos_uso import (
    CrearGrupoUseCase,
    ListarGruposUseCase,
    EliminarGrupoUseCase,
)
from .dominio.puertos import RepositorioGrupos


class InMemoryGrupoRepo(RepositorioGrupos):
    def __init__(self):
        self.grupos = []
        self._next_id = 1

    def listar_todos(self):
        return list(self.grupos)

    def obtener_por_id(self, grupo_id: int):
        for g in self.grupos:
            if g.id == grupo_id:
                return g
        return None

    def guardar(self, grupo: GrupoEntidad):
        if grupo.id is None:
            grupo.id = self._next_id
            self._next_id += 1
            self.grupos.append(grupo)
        else:
            self.grupos = [g if g.id != grupo.id else grupo for g in self.grupos]
        return grupo

    def eliminar(self, grupo_id: int):
        initial_len = len(self.grupos)
        self.grupos = [g for g in self.grupos if g.id != grupo_id]
        return len(self.grupos) < initial_len

    def listar_estudiantes_activos(self):
        return [{"id": 1, "first_name": "Estudiante", "last_name": "Demo", "role": "STUDENT"}]


class TestGruposDomainAndApp(unittest.TestCase):
    def setUp(self):
        self.repo = InMemoryGrupoRepo()
        self.crear_uc = CrearGrupoUseCase(self.repo)
        self.listar_uc = ListarGruposUseCase(self.repo)
        self.eliminar_uc = EliminarGrupoUseCase(self.repo)

    def test_creacion_grupo_exitoso(self):
        grupo = self.crear_uc.ejecutar(
            name="Comite Curricular",
            fecha=date(2026, 1, 1),
            description="Descripcion de prueba",
            advisor_id=5,
        )
        self.assertIsNotNone(grupo.id)
        self.assertEqual(grupo.name, "Comite Curricular")
        self.assertEqual(len(self.listar_uc.ejecutar(user_id=5, es_admin=False)), 1)
        self.assertEqual(len(self.listar_uc.ejecutar(user_id=99, es_admin=False)), 0)

    def test_control_propiedad_al_eliminar_grupo(self):
        grupo = self.crear_uc.ejecutar(
            name="Consejo de Facultad",
            fecha=date(2026, 1, 1),
            advisor_id=5,
        )
        with self.assertRaises(PermissionError):
            self.eliminar_uc.ejecutar(grupo.id, user_id=99, es_admin=False)
        self.assertTrue(self.eliminar_uc.ejecutar(grupo.id, user_id=5, es_admin=False))

    def test_validacion_nombre_vacio_falla(self):
        with self.assertRaises(ValueError):
            self.crear_uc.ejecutar(name="   ", fecha=date(2026, 1, 1))
