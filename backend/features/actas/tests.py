import copy
import unittest

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .dominio.entidades import ActaReunionEntidad, Actor, EstadoActa, sincronizar_firmas
from .aplicacion.casos_uso import (
    CrearActaUseCase, EditarActaUseCase, ObtenerActaUseCase, EliminarActaUseCase, FirmarActaUseCase,
    AgregarObservacionUseCase, CambiarEstadoActaUseCase, GestionarFirmaUseCase,
)
from .dominio.puertos import RepositorioActas, RepositorioFirmas

FIRMA = 'data:image/png;base64,iVBORw0KGgo='


class InMemoryActaRepo(RepositorioActas):
    def __init__(self):
        self.actas = {}
        self._next_id = 1

    def listar_visibles(self, actor):
        return [a for a in self.actas.values() if a.puede_consultar(actor)]

    def listar_mis_actas(self, user_id):
        return [a for a in self.actas.values() if a.pertenece_a_usuario(user_id)]

    def obtener_por_id(self, acta_id):
        acta = self.actas.get(acta_id)
        return copy.deepcopy(acta) if acta else None

    def crear(self, acta):
        acta.id = self._next_id
        self._next_id += 1
        self.actas[acta.id] = copy.deepcopy(acta)
        return acta

    def modificar(self, acta_id, cambio):
        acta = self.obtener_por_id(acta_id)
        if not acta:
            raise LookupError('Acta no encontrada')
        cambio(acta)
        acta.recalcular_participantes()
        self.actas[acta_id] = copy.deepcopy(acta)
        return acta

    def eliminar(self, acta_id):
        return self.actas.pop(acta_id, None) is not None


class InMemoryFirmaRepo(RepositorioFirmas):
    def __init__(self):
        self.firmas = {}

    def obtener_por_usuario(self, user_id):
        return self.firmas.get(user_id)

    def guardar_o_actualizar(self, firma):
        self.firmas[firma.user_id] = firma
        return firma


REDACTOR = Actor(10, 'REDACTOR', dependencia_id=1, nombre='Rita Redactora')
PARTICIPANTE = Actor(20, 'REDACTOR', dependencia_id=1, nombre='Nelson Sanchez')
REVISOR = Actor(30, 'REVISOR', dependencia_id=1, nombre='Carlos Merchán')
REVISOR_OTRA = Actor(31, 'REVISOR', dependencia_id=2, nombre='Otra Revisora')
EXTERNO = Actor(99, 'REDACTOR', dependencia_id=1, nombre='Ajeno')
ADMIN = Actor(1, 'ADMIN', nombre='Admin')


def datos_acta(**extra):
    return {
        'tipo': 'ACTA', 'orden_dia': '1. Apertura',
        'asistentes': [{'nombre': 'Rita Redactora', 'user_id': 10}, {'nombre': 'Nelson Sanchez', 'user_id': 20}],
        **extra,
    }


class SincronizarFirmasTests(unittest.TestCase):
    def test_quien_se_agrega_despues_queda_como_firmante(self):
        data = {'asistentes': [{'nombre': 'Ana', 'user_id': 1}], 'firmas': [
            {'nombre': 'Ana', 'user_id': 1, 'firmado': True, 'firma': FIRMA, 'fecha': 'x'}]}
        data['asistentes'].append({'nombre': 'Nelson', 'user_id': 6})
        firmas = sincronizar_firmas(data)
        self.assertEqual([f['nombre'] for f in firmas], ['Ana', 'Nelson'])
        self.assertTrue(firmas[0]['firmado'])
        self.assertEqual(firmas[1]['user_id'], 6)

    def test_vincula_por_nombre_sin_tildes_y_no_duplica(self):
        data = {'asistentes': [{'nombre': 'Nelsón Sánchez', 'user_id': 6}, {'nombre': 'N/A'}],
                'invitados': [{'nombre': ''}],
                'firmas': [{'nombre': 'nelson sanchez', 'user_id': None, 'firmado': False}]}
        firmas = sincronizar_firmas(data)
        self.assertEqual(len(firmas), 1)
        self.assertEqual(firmas[0]['user_id'], 6)


class FlujoDeActasTests(unittest.TestCase):
    def setUp(self):
        self.repo = InMemoryActaRepo()
        self.firmas = InMemoryFirmaRepo()
        self.crear = CrearActaUseCase(self.repo)
        self.editar = EditarActaUseCase(self.repo)
        self.obtener = ObtenerActaUseCase(self.repo)
        self.eliminar = EliminarActaUseCase(self.repo)
        self.firmar = FirmarActaUseCase(self.repo, self.firmas)
        self.observar = AgregarObservacionUseCase(self.repo)
        self.estado = CambiarEstadoActaUseCase(self.repo)
        self.acta = self.crear.ejecutar(datos_acta(), REDACTOR)

    def test_al_crear_queda_en_borrador_en_la_dependencia_del_creador_con_firmantes(self):
        self.assertEqual(self.acta.estado, EstadoActa.BORRADOR)
        self.assertEqual(self.acta.dependencia_id, 1)
        self.assertEqual([f['user_id'] for f in self.acta.data['firmas']], [10, 20])
        self.assertIn(20, self.acta.participantes_ids)

    def test_quien_puede_ver_el_acta(self):
        for actor in (REDACTOR, PARTICIPANTE, REVISOR, ADMIN):
            self.obtener.ejecutar(self.acta.id, actor)
        for actor in (REVISOR_OTRA, EXTERNO):
            with self.assertRaises(PermissionError):
                self.obtener.ejecutar(self.acta.id, actor)

    def test_participante_no_edita_pero_revisor_de_la_dependencia_si(self):
        with self.assertRaises(PermissionError):
            self.editar.ejecutar(self.acta.id, datos_acta(orden_dia='cambiado'), PARTICIPANTE)
        with self.assertRaises(PermissionError):
            self.editar.ejecutar(self.acta.id, datos_acta(orden_dia='cambiado'), REVISOR_OTRA)
        editada = self.editar.ejecutar(self.acta.id, datos_acta(orden_dia='corregido'), REVISOR)
        self.assertEqual(editada.data['orden_dia'], 'corregido')

    def test_editar_no_borra_observaciones_ni_permite_falsificar_firmas(self):
        self.observar.ejecutar(self.acta.id, PARTICIPANTE, 'Falta mi nombre en ausentes')
        enviado = datos_acta(comentarios=[], firmas=[{'nombre': 'Nelson Sanchez', 'user_id': 20, 'firmado': True,
                                                     'firma': FIRMA}])
        editada = self.editar.ejecutar(self.acta.id, enviado, REDACTOR)
        self.assertEqual(len(editada.data['comentarios']), 1)
        self.assertTrue(all(not f['firmado'] for f in editada.data['firmas']))

    def test_solo_se_firma_cuando_esta_publicada(self):
        with self.assertRaises(PermissionError):
            self.firmar.ejecutar(self.acta.id, PARTICIPANTE, FIRMA)
        self.estado.ejecutar(self.acta.id, REDACTOR, EstadoActa.PARA_FIRMA)
        firmada = self.firmar.ejecutar(self.acta.id, PARTICIPANTE, FIRMA)
        mia = next(f for f in firmada.data['firmas'] if f['user_id'] == 20)
        self.assertTrue(mia['firmado'])
        with self.assertRaises(PermissionError):
            self.firmar.ejecutar(self.acta.id, PARTICIPANTE, FIRMA)
        with self.assertRaises(PermissionError):
            self.firmar.ejecutar(self.acta.id, REVISOR, FIRMA)  # no es firmante

    def test_firma_con_la_firma_personal_guardada(self):
        self.estado.ejecutar(self.acta.id, REDACTOR, EstadoActa.PARA_FIRMA)
        with self.assertRaises(ValueError):
            self.firmar.ejecutar(self.acta.id, PARTICIPANTE)
        GestionarFirmaUseCase(self.firmas).registrar_firma(20, FIRMA)
        firmada = self.firmar.ejecutar(self.acta.id, PARTICIPANTE)
        self.assertTrue(next(f for f in firmada.data['firmas'] if f['user_id'] == 20)['firmado'])

    def test_publicada_no_se_edita_y_reabrirla_anula_las_firmas(self):
        self.estado.ejecutar(self.acta.id, REDACTOR, EstadoActa.PARA_FIRMA)
        self.firmar.ejecutar(self.acta.id, PARTICIPANTE, FIRMA)
        with self.assertRaises(PermissionError):
            self.editar.ejecutar(self.acta.id, datos_acta(), REDACTOR)
        with self.assertRaises(PermissionError):
            self.estado.ejecutar(self.acta.id, PARTICIPANTE, EstadoActa.BORRADOR)
        reabierta = self.estado.ejecutar(self.acta.id, REDACTOR, EstadoActa.BORRADOR, 'Faltaba un compromiso')
        self.assertEqual(reabierta.estado, EstadoActa.BORRADOR)
        self.assertTrue(all(not f['firmado'] for f in reabierta.data['firmas']))
        self.assertIn('se anularon', reabierta.data['comentarios'][-1]['texto'])

    def test_flujo_con_revision(self):
        with self.assertRaises(PermissionError):
            self.estado.ejecutar(self.acta.id, REVISOR, EstadoActa.EN_REVISION)  # lo envía quien redacta
        self.estado.ejecutar(self.acta.id, REDACTOR, EstadoActa.EN_REVISION)
        with self.assertRaises(PermissionError):
            self.estado.ejecutar(self.acta.id, REDACTOR, EstadoActa.PARA_FIRMA)  # aprobar es del revisor
        devuelta = self.estado.ejecutar(self.acta.id, REVISOR, EstadoActa.BORRADOR, 'Ajustar el punto 2')
        self.assertEqual(devuelta.data['comentarios'][-1]['tipo'], 'devolucion')
        self.estado.ejecutar(self.acta.id, REDACTOR, EstadoActa.EN_REVISION)
        aprobada = self.estado.ejecutar(self.acta.id, REVISOR, EstadoActa.PARA_FIRMA)
        self.assertEqual(aprobada.estado, EstadoActa.PARA_FIRMA)

    def test_observaciones(self):
        acta = self.observar.ejecutar(self.acta.id, PARTICIPANTE, '  Falta mi nombre  ')
        obs = acta.data['comentarios'][0]
        self.assertEqual((obs['autor'], obs['autor_id'], obs['texto']), ('Nelson Sanchez', 20, 'Falta mi nombre'))
        with self.assertRaises(ValueError):
            self.observar.ejecutar(self.acta.id, PARTICIPANTE, '   ')
        with self.assertRaises(PermissionError):
            self.observar.ejecutar(self.acta.id, EXTERNO, 'hola')

    def test_eliminar(self):
        with self.assertRaises(PermissionError):
            self.eliminar.ejecutar(self.acta.id, PARTICIPANTE)
        self.estado.ejecutar(self.acta.id, REDACTOR, EstadoActa.PARA_FIRMA)
        self.firmar.ejecutar(self.acta.id, PARTICIPANTE, FIRMA)
        with self.assertRaises(PermissionError):
            self.eliminar.ejecutar(self.acta.id, REDACTOR)  # ya tiene firmas
        self.assertTrue(self.eliminar.ejecutar(self.acta.id, ADMIN))

    def test_firma_personal(self):
        uc = GestionarFirmaUseCase(self.firmas)
        uc.registrar_firma(user_id=10, firma_data=FIRMA)
        self.assertEqual(uc.obtener_firma(user_id=10), FIRMA)
        with self.assertRaises(ValueError):
            uc.registrar_firma(user_id=10, firma_data='  ')


class ActasApiTests(TestCase):
    def setUp(self):
        from features.usuarios.infraestructura.models import Dependencia
        User = get_user_model()
        dep = Dependencia.objects.create(nombre='CINNDET')
        self.redactor = User.objects.create_user(username='rita', password='x', role='REDACTOR', dependencia=dep,
                                                 first_name='Rita')
        self.nelson = User.objects.create_user(username='nelson', password='x', role='REDACTOR', dependencia=dep,
                                               first_name='Nelson', last_name='Sanchez')
        self.revisor = User.objects.create_user(username='carlos', password='x', role='REVISOR', dependencia=dep)
        self.client = APIClient()

    def como(self, user):
        self.client.force_authenticate(user)
        return self.client

    def test_autoguardado_devuelve_updated_at_y_no_persiste_campos_de_interfaz(self):
        res = self.como(self.redactor).post('/api/actas/reuniones/', {
            'tipo': 'ACTA', 'borrador': True, 'isNew': True, 'updated_at': 'viejo', 'estado': 'PARA_FIRMA',
        }, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data['updated_at'])
        self.assertEqual(res.data['estado'], 'BORRADOR')  # el estado no se elige al guardar
        self.assertEqual(res.data['dependencia_nombre'], 'CINNDET')
        from .infraestructura.models import ActaReunion
        guardada = ActaReunion.objects.get(pk=res.data['id'])
        self.assertNotIn('isNew', guardada.data)
        self.assertNotIn('estado', guardada.data)

        res2 = self.client.put(f"/api/actas/reuniones/{res.data['id']}/", {
            **res.data, 'orden_dia': '1. Apertura',
        }, format='json')
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.data['orden_dia'], '1. Apertura')

    def test_participante_agregado_despues_ve_firma_y_observa(self):
        acta = self.como(self.redactor).post('/api/actas/reuniones/', {'tipo': 'ACTA'}, format='json').data
        acta['asistentes'] = [{'nombre': 'Nelson Sanchez', 'user_id': self.nelson.id}]
        self.client.put(f"/api/actas/reuniones/{acta['id']}/", acta, format='json')
        self.client.post(f"/api/actas/reuniones/{acta['id']}/estado/", {'estado': 'PARA_FIRMA'}, format='json')

        visibles = self.como(self.nelson).get('/api/actas/reuniones/').data
        self.assertEqual([a['id'] for a in visibles], [acta['id']])
        self.assertTrue(visibles[0]['permisos']['firmar'])
        self.assertFalse(visibles[0]['permisos']['editar'])

        put = self.client.put(f"/api/actas/reuniones/{acta['id']}/", visibles[0], format='json')
        self.assertEqual(put.status_code, 403)
        obs = self.client.post(f"/api/actas/reuniones/{acta['id']}/observaciones/", {'texto': 'Falta mi cargo'},
                               format='json')
        self.assertEqual(obs.status_code, 201)
        self.assertEqual(obs.data['comentarios'][0]['autor'], 'Nelson Sanchez')
        firma = self.client.post(f"/api/actas/reuniones/{acta['id']}/firmar/", {'firma_data': FIRMA}, format='json')
        self.assertEqual(firma.status_code, 200)
        self.assertTrue(firma.data['firmas'][0]['firmado'])

        # El revisor de la dependencia la ve aunque no participe.
        del_revisor = self.como(self.revisor).get(f"/api/actas/reuniones/{acta['id']}/")
        self.assertEqual(del_revisor.status_code, 200)
        self.assertTrue(del_revisor.data['permisos']['revisar'])
