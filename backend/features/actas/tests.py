import unittest
from .dominio.entidades import ActaReunionEntidad
from .aplicacion.casos_uso import (
    GuardarActaUseCase,
    ObtenerActaUseCase,
    EliminarActaUseCase,
    GestionarFirmaUseCase,
)
from .dominio.puertos import RepositorioActas, RepositorioFirmas


class InMemoryActaRepo(RepositorioActas):
    def __init__(self):
        self.actas = []
        self._next_id = 1

    def listar_por_usuario(self, user_id, es_admin=False):
        if es_admin:
            return list(self.actas)
        return [a for a in self.actas if a.pertenece_a_usuario(user_id)]

    def listar_mis_actas(self, user_id):
        return [a for a in self.actas if a.pertenece_a_usuario(user_id)]

    def obtener_por_id(self, acta_id):
        for a in self.actas:
            if a.id == acta_id:
                return a
        return None

    def guardar(self, acta):
        if acta.id is None:
            acta.id = self._next_id
            self._next_id += 1
            self.actas.append(acta)
        else:
            self.actas = [a if a.id != acta.id else acta for a in self.actas]
        return acta

    def eliminar(self, acta_id):
        init = len(self.actas)
        self.actas = [a for a in self.actas if a.id != acta_id]
        return len(self.actas) < init


class InMemoryFirmaRepo(RepositorioFirmas):
    def __init__(self):
        self.firmas = {}

    def obtener_por_usuario(self, user_id):
        return self.firmas.get(user_id)

    def guardar_o_actualizar(self, firma):
        self.firmas[firma.user_id] = firma
        return firma


class TestActasDomainAndApp(unittest.TestCase):
    def setUp(self):
        self.acta_repo = InMemoryActaRepo()
        self.firma_repo = InMemoryFirmaRepo()
        self.guardar_acta_uc = GuardarActaUseCase(self.acta_repo)
        self.obtener_acta_uc = ObtenerActaUseCase(self.acta_repo)
        self.eliminar_acta_uc = EliminarActaUseCase(self.acta_repo)
        self.firma_uc = GestionarFirmaUseCase(self.firma_repo)

    def test_guardar_acta_incluye_creador_y_participantes_del_payload(self):
        acta = self.guardar_acta_uc.ejecutar(
            data={"tema": "Revision curricular", "participantes": [{"user_id": 25}]},
            creador_id=10,
            participantes_ids=[20],
        )
        self.assertIn(10, acta.participantes_ids)
        self.assertIn(20, acta.participantes_ids)
        self.assertIn(25, acta.participantes_ids)

    def test_prevencion_idor_lectura_edicion_y_eliminacion(self):
        acta = self.guardar_acta_uc.ejecutar(
            data={"tema": "Consejo"},
            creador_id=10,
            participantes_ids=[20],
        )
        # Participante (20) puede consultar y firmar/actualizar, pero no eliminar
        leida = self.obtener_acta_uc.ejecutar(acta.id, user_id=20, es_admin=False)
        self.assertEqual(leida.id, acta.id)
        with self.assertRaises(PermissionError):
            self.eliminar_acta_uc.ejecutar(acta.id, user_id=20, es_admin=False)

        # Usuario externo (99) no puede consultar ni actualizar
        with self.assertRaises(PermissionError):
            self.obtener_acta_uc.ejecutar(acta.id, user_id=99, es_admin=False)
        with self.assertRaises(PermissionError):
            self.guardar_acta_uc.ejecutar(
                data={"tema": "Intento no autorizado"},
                creador_id=99,
                acta_id=acta.id,
                es_admin=False,
            )

    def test_registrar_y_obtener_firma(self):
        self.firma_uc.registrar_firma(user_id=10, firma_data="data:image/png;base64,sample")
        firma = self.firma_uc.obtener_firma(user_id=10)
        self.assertEqual(firma, "data:image/png;base64,sample")

    def test_firma_vacia_falla(self):
        with self.assertRaises(ValueError):
            self.firma_uc.registrar_firma(user_id=10, firma_data="  ")


from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient


class AutoguardadoApiTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='docente1', password='x', role='TEACHER'
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_devuelve_updated_at_y_no_persiste_campos_de_interfaz(self):
        res = self.client.post('/api/actas/reuniones/', {
            'tipo': 'ACTA', 'borrador': True, 'isNew': True, 'updated_at': 'viejo',
        }, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data['updated_at'])
        self.assertNotIn('isNew', res.data)

        from .infraestructura.models import ActaReunion
        guardada = ActaReunion.objects.get(pk=res.data['id'])
        self.assertNotIn('isNew', guardada.data)
        self.assertNotIn('updated_at', guardada.data)
        self.assertTrue(guardada.data['borrador'])

        res2 = self.client.put(f"/api/actas/reuniones/{res.data['id']}/", {
            **res.data, 'orden_dia': '1. Apertura', 'borrador': False,
        }, format='json')
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.data['orden_dia'], '1. Apertura')
        self.assertFalse(res2.data['borrador'])
