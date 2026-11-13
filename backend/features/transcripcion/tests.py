import json
import shutil
import tempfile
import unittest
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .aplicacion.casos_uso import limpiar_contexto
from .aplicacion.redaccion import GenerarPropuestaActa
from .dominio.entidades import Segmento, Turno, extension_valida
from .dominio.puertos import ModeloLenguaje
from .dominio.servicios import (
    asignar_hablantes, dividir_texto, extraer_json, normalizar_propuesta,
    renumerar_hablantes, transcripcion_como_texto,
)


class ServiciosTests(unittest.TestCase):
    def test_asigna_la_voz_con_mayor_solape(self):
        segs = [Segmento(0, 4, 'Hola'), Segmento(4, 9, 'Buenos días'), Segmento(20, 21, 'Fin')]
        turnos = [Turno(0, 4.5, 'A'), Turno(4.5, 10, 'B')]
        r = asignar_hablantes(segs, turnos)
        self.assertEqual([s.hablante for s in r], ['A', 'B', 'B'])

    def test_renumera_por_orden_de_aparicion(self):
        r = renumerar_hablantes([Turno(5, 6, '3'), Turno(0, 1, '0'), Turno(7, 8, '0')])
        self.assertEqual([t.hablante for t in r], ['Hablante 1', 'Hablante 2', 'Hablante 1'])

    def test_texto_agrupa_intervenciones_y_usa_nombres(self):
        segs = [Segmento(0, 1, 'Hola.', 'Hablante 1'), Segmento(1, 2, 'Sigo yo.', 'Hablante 1'),
                Segmento(65, 70, 'Respondo.', 'Hablante 2')]
        texto = transcripcion_como_texto(segs, {'Hablante 1': 'Laura Gómez'})
        self.assertEqual(texto, '[00:00:00] Laura Gómez: Hola. Sigo yo.\n[00:01:05] Hablante 2: Respondo.')

    def test_dividir_texto_respeta_limite_y_no_pierde_contenido(self):
        texto = '\n'.join(f'linea {i} ' + 'x' * 30 for i in range(50))
        partes = dividir_texto(texto, 200)
        self.assertTrue(all(len(p) <= 200 for p in partes))
        self.assertEqual(''.join(p.replace('\n', '') for p in partes), texto.replace('\n', ''))

    def test_extraer_json_tolera_bloques_de_codigo_y_texto(self):
        self.assertEqual(extraer_json('```json\n{"a": 1}\n```'), {'a': 1})
        self.assertEqual(extraer_json('Claro, aquí está: {"a": 2} ¡Listo!'), {'a': 2})
        with self.assertRaises(ValueError):
            extraer_json('sin json')

    def test_normalizar_propuesta(self):
        p = normalizar_propuesta({
            'orden_dia': '1. Apertura\n2) Plan de estudios',
            'compromisos': [
                {'compromiso': 'Enviar programa', 'responsable': 'Carlos', 'fecha': '2026-11-20'},
                {'compromiso': 'Llamar colegios', 'responsable': 'Carlos', 'fecha': 'mediados de diciembre'},
                {'compromiso': 'N/A'},
            ],
            'asistentes_mencionados': [{'nombre': 'Hablante 2'}, {'nombre': 'Laura Gómez', 'cargo': 'Coordinadora'}],
        }, 'PUNTO 1. APERTURA')
        self.assertEqual(p['orden_dia'], ['Apertura', 'Plan de estudios'])
        self.assertEqual(len(p['compromisos']), 2)
        self.assertEqual(p['compromisos'][0]['fecha'], '2026-11-20')
        self.assertEqual(p['compromisos'][1]['fecha'], '')
        self.assertIn('mediados de diciembre', p['compromisos'][1]['compromiso'])
        self.assertEqual(p['asistentes_mencionados'], [{'nombre': 'Laura Gómez', 'cargo': 'Coordinadora'}])
        self.assertEqual(p['proxima_convocatoria'], 'N/A')

    def test_extension_y_contexto(self):
        self.assertEqual(extension_valida('Reunión.MP4'), 'mp4')
        self.assertIsNone(extension_valida('virus.exe'))
        ctx = limpiar_contexto({'lugar': 'Sala', 'clave_rara': 'x', 'num_hablantes': '3',
                                'asistentes': [{'nombre': 'Ana', 'cargo': 'Docente', 'foto': 'data:...'}]})
        self.assertEqual(ctx, {'lugar': 'Sala', 'asistentes': [{'nombre': 'Ana', 'cargo': 'Docente'}],
                               'ausentes': [], 'invitados': [], 'num_hablantes': 3})


class IAFalsa(ModeloLenguaje):
    """Responde según el tipo de instrucción, como lo haría un modelo obediente."""
    nombre = 'IA de prueba'

    def __init__(self, max_caracteres=100_000, por_punto=False, notas=None):
        self.max_caracteres_transcripcion = max_caracteres
        self.desarrollo_por_punto = por_punto
        self.notas = notas or ('### PUNTO 1\n- Laura Gómez presentó tres cambios al plan de estudios.\n'
                               '### PUNTO 2\n- (nada)\n'
                               '### COMPROMISOS\n- Carlos Ruiz enviará el programa el 20 de noviembre.')
        self.prompts = []

    def completar(self, prompt, formato_json=False):
        self.prompts.append(prompt)
        if 'Clasifica cada nota' in prompt:
            return json.dumps({'1': 1, '2': 'x'})  # la segunda no se clasifica: queda con la anterior
        if 'Define el ORDEN DEL DÍA' in prompt:
            return json.dumps({'orden_dia': ['Plan de estudios', 'Prácticas']})
        if formato_json:
            return json.dumps({
                'orden_dia': ['Plan de estudios', 'Prácticas'],
                'compromisos': [{'compromiso': 'Enviar programa', 'responsable': 'Carlos Ruiz', 'fecha': '2026-11-20'}],
                'proxima_convocatoria': '5 de diciembre, 2:00 p. m.',
                'asistentes_mencionados': [{'nombre': 'Laura Gómez', 'cargo': 'Coordinadora'}],
            })
        if 'Toma NOTAS DETALLADAS' in prompt and 'ORDEN DEL DÍA:' not in prompt:
            return ('### NOTAS\n- Laura Gómez presentó tres cambios al plan de estudios.\n- Se aprobó el cambio de horario.\n'
                    '### COMPROMISOS\n- Carlos Ruiz enviará el programa el 20 de noviembre.\n### PRÓXIMA REUNIÓN\n- (nada)')
        if 'Toma NOTAS DETALLADAS' in prompt:
            return self.notas
        if 'Redacta el desarrollo del punto' in prompt:
            return 'PUNTO 7. OTRO TÍTULO\nEl Orador 2 presentó los cambios del plan.'
        if 'Vas a leer la parte' in prompt:
            return '- notas resumidas'
        return ('PUNTO 1. PLAN DE ESTUDIOS\nSe presentaron los cambios.\n\n'
                'PUNTO 2. PRÁCTICAS\nNo se encontró información sobre este punto en la transcripción.')


class EncabezadoTests(unittest.TestCase):
    def test_reemplaza_o_agrega_el_titulo_del_punto(self):
        from .aplicacion.redaccion import con_encabezado
        self.assertEqual(con_encabezado(0, 'Apertura', 'Se abrió la sesión.'), 'PUNTO 1. APERTURA\nSe abrió la sesión.')
        self.assertEqual(con_encabezado(1, 'Varios', '**PUNTO 7: OTRA COSA**\nTexto.'), 'PUNTO 2. VARIOS\nTexto.')
        self.assertEqual(con_encabezado(0, 'A', 'Se acordó X. Sin desarrollo registrado en la grabación.'), 'PUNTO 1. A\nSe acordó X.')
        self.assertEqual(con_encabezado(0, 'A', ''), 'PUNTO 1. A\nNo se encontró información sobre este punto en la transcripción.')

    def test_quita_etiquetas_genericas_de_la_prosa(self):
        from .aplicacion.redaccion import sin_etiquetas_genericas
        self.assertEqual(sin_etiquetas_genericas('Se acordó que Orador 2 practicaría y el hablante 1 enviaría.'),
                         'Se acordó que un participante practicaría y un participante enviaría.')
        self.assertEqual(sin_etiquetas_genericas('A propuesta del Parte 2 · Orador 1.'), 'A propuesta de un participante.')

    def test_orden_del_dia_escrito_por_la_persona(self):
        from .aplicacion.redaccion import orden_desde_texto
        self.assertEqual(orden_desde_texto('1. Saludo\n2) Informe del decano\n\nPunto 3: Varios\nN/A'),
                         ['Saludo', 'Informe del decano', 'Varios'])

    def test_separa_las_notas_por_punto(self):
        from .aplicacion.redaccion import separar_notas
        por_punto, otras = separar_notas(
            '### PUNTO 1\n- a\n- b\n**PUNTO 2: Prácticas**\n- (nada)\n### PUNTO 9\n- fuera de rango\n'
            '### COMPROMISOS\n- c\n### PRÓXIMA REUNIÓN\n- (nada)\n### PARTICIPANTES\n- Ana (docente)', 2)
        self.assertEqual(por_punto, [['- a', '- b'], []])
        self.assertEqual(otras, {'notas': [], 'compromisos': ['- c'], 'proxima': [], 'participantes': ['- Ana (docente)']})


class RedaccionTests(unittest.TestCase):
    segs = [Segmento(i * 10, i * 10 + 9, f'Intervención número {i} sobre el plan de estudios.', f'Hablante {i % 2 + 1}')
            for i in range(40)]

    def test_modelo_grande_redacta_todo_de_una_vez(self):
        ia = IAFalsa()
        p = GenerarPropuestaActa(ia).ejecutar(self.segs, {'hora_inicio': '14:00', 'hora_final': '16:00'})
        self.assertEqual(len(ia.prompts), 2)
        self.assertIn('Intervención número 39', ia.prompts[0])
        self.assertIn('1400 palabras', ia.prompts[1])  # 2 h × 700, como el acta de referencia
        self.assertEqual(p['orden_dia'], ['Plan de estudios'])
        self.assertEqual(p['desarrollo'], 'PUNTO 1. PLAN DE ESTUDIOS\nSe presentaron los cambios.')
        self.assertIn('Se quitó el punto "Prácticas"', p['avisos'][0])

    def test_modelo_local_toma_notas_por_fragmento_y_redacta_por_punto(self):
        ia = IAFalsa(max_caracteres=800, por_punto=True)
        p = GenerarPropuestaActa(ia).ejecutar(self.segs, {})
        notas = [x for x in ia.prompts if 'Toma NOTAS DETALLADAS' in x]
        clasificacion = [x for x in ia.prompts if 'Clasifica cada nota' in x]
        self.assertGreater(len(notas), 1)  # no cabe entera: notas por fragmento
        self.assertEqual(len(clasificacion), len(notas))
        self.assertIn('NOTAS DE LA REUNIÓN', next(x for x in ia.prompts if 'Define el ORDEN DEL DÍA' in x))
        redaccion = [x for x in ia.prompts if 'Redacta el desarrollo del punto' in x]
        self.assertEqual(len(redaccion), 1)  # del punto sin notas no se le pregunta a la IA
        self.assertIn('Laura Gómez presentó tres cambios', redaccion[0])
        self.assertIn('Se aprobó el cambio de horario', redaccion[0])  # sin clasificar: sigue a la anterior
        self.assertNotIn('Intervención número', redaccion[0])  # redacta desde sus notas, no desde todo
        self.assertEqual(p['orden_dia'], ['Plan de estudios'])
        self.assertEqual(p['desarrollo'], 'PUNTO 1. PLAN DE ESTUDIOS\nUn participante presentó los cambios del plan.')
        self.assertEqual(p['compromisos'][0]['responsable'], 'Carlos Ruiz')
        self.assertEqual(len(p['avisos']), 1)

    def test_usa_el_orden_del_dia_de_la_persona_y_avisa_lo_que_no_se_trato(self):
        ia = IAFalsa(por_punto=True)
        p = GenerarPropuestaActa(ia).ejecutar(self.segs, {'orden_dia': '1. Plan de estudios\n2. Prácticas'})
        self.assertFalse(any('ORDEN DEL DÍA' in x and 'Define' in x for x in ia.prompts))
        self.assertEqual(p['orden_dia'], ['Plan de estudios', 'Prácticas'])
        self.assertTrue(p['desarrollo'].endswith(
            'PUNTO 2. PRÁCTICAS\nNo se encontró información sobre este punto en la transcripción.'))
        self.assertIn('No se encontró en la transcripción información sobre el punto "Prácticas"', p['avisos'][0])

    def test_la_transcripcion_se_lee_una_sola_vez(self):
        for contexto in ({}, {'orden_dia': '1. Plan de estudios'}):
            ia = IAFalsa(max_caracteres=800, por_punto=True)
            GenerarPropuestaActa(ia).ejecutar(self.segs, contexto)
            for i in range(40):
                frase = f'Intervención número {i} sobre'
                self.assertEqual(sum(frase in x for x in ia.prompts), 1, frase)

    def test_nombres_de_hablantes_se_usan_en_el_material(self):
        ia = IAFalsa()
        GenerarPropuestaActa(ia).ejecutar(self.segs, {}, {'Hablante 1': 'Laura Gómez'})
        self.assertIn('Laura Gómez:', ia.prompts[0])


class TranscriptorFalso:
    """Cada archivo dura 10 s y tiene dos frases."""
    def __init__(self):
        self.llamadas = 0

    def transcribir(self, ruta, avance):
        self.llamadas += 1
        avance(0.5)
        return [Segmento(0, 5, f'Frase A del archivo {self.llamadas}.'), Segmento(5, 9, f'Frase B del archivo {self.llamadas}.')], 10.0


class IdentificadorFalso:
    """Recibe todos los audios juntos: la misma voz conserva la etiqueta en todas las partes."""
    def __init__(self):
        self.rutas = None

    def identificar(self, rutas, avance, num_hablantes=None):
        self.rutas = rutas
        turnos = []
        for i in range(len(rutas)):
            turnos += [Turno(i * 10, i * 10 + 5, '0'), Turno(i * 10 + 5, i * 10 + 9, '4')]
        return turnos


class TextoPegadoTests(unittest.TestCase):
    def test_reconoce_hablantes_en_formatos_comunes(self):
        from .dominio.servicios import segmentos_desde_texto
        texto = ('Orador 1: Buenos días.\nSeguimos.\nLaura Gómez: Gracias.\n'
                 '[00:12:03] Orador 2: Nota importante: hay quórum.\n'
                 'Carlos Ruiz   0:03\nTexto de Carlos.\n00:00:05.000 --> 00:00:07.000\nSigue Carlos.')
        segs = segmentos_desde_texto(texto)
        self.assertEqual([(s.hablante, s.texto) for s in segs], [
            ('Orador 1', 'Buenos días.'), ('Orador 1', 'Seguimos.'), ('Laura Gómez', 'Gracias.'),
            ('Orador 2', 'Nota importante: hay quórum.'), ('Carlos Ruiz', 'Texto de Carlos.'), ('Carlos Ruiz', 'Sigue Carlos.'),
        ])

    def test_en_varias_partes_las_etiquetas_genericas_no_se_mezclan(self):
        from .dominio.servicios import segmentos_desde_texto
        p1 = segmentos_desde_texto('Orador 1: Abro la sesión.\nLaura Gómez: Hola.', 0, 2)
        p2 = segmentos_desde_texto('Orador 1: Continúo yo.\nLaura Gómez: Sigo.', 1, 2, desde=len(p1))
        self.assertEqual([s.hablante for s in p1 + p2],
                         ['Parte 1 · Orador 1', 'Laura Gómez', 'Parte 2 · Orador 1', 'Laura Gómez'])
        texto = transcripcion_como_texto(p1 + p2, con_tiempos=False)
        self.assertEqual(texto.split('\n'), [
            '=== Parte 1 de 2 ===', 'Parte 1 · Orador 1: Abro la sesión.', 'Laura Gómez: Hola.',
            '=== Parte 2 de 2 ===', 'Parte 2 · Orador 1: Continúo yo.', 'Laura Gómez: Sigo.',
        ])


class GrabacionesApiTests(TestCase):
    def setUp(self):
        self.media = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.media, ignore_errors=True)
        ajustes = override_settings(MEDIA_ROOT=self.media)
        ajustes.enable()
        self.addCleanup(ajustes.disable)

        self.transcriptor = TranscriptorFalso()
        self.identificador = IdentificadorFalso()
        from .infraestructura import contenedor
        for nombre, valor in {
            'transcriptor': lambda: self.transcriptor,
            'identificador': lambda: self.identificador,
            'modelo_lenguaje': lambda: IAFalsa(),
        }.items():
            parche = mock.patch.object(contenedor, nombre, valor)
            parche.start()
            self.addCleanup(parche.stop)
        # El trabajador se ejecuta a mano en las pruebas, no en un hilo.
        parche = mock.patch('features.transcripcion.infraestructura.trabajador.avisar')
        parche.start()
        self.addCleanup(parche.stop)

        User = get_user_model()
        self.docente = User.objects.create_user(username='doc', password='x', role='TEACHER')
        self.otro = User.objects.create_user(username='otro', password='x', role='TEACHER')
        self.client = APIClient()
        self.client.force_authenticate(self.docente)

    def _subir(self, id_, offset, datos, parte=0):
        return self.client.put(f'/api/grabaciones/{id_}/contenido/?parte={parte}&offset={offset}', data=datos,
                               content_type='application/octet-stream')

    def _procesar(self):
        from .infraestructura.trabajador import procesar_pendientes
        return procesar_pendientes()

    def test_flujo_completo_subida_por_trozos_y_propuesta(self):
        audio = b'A' * 1000 + b'B' * 500
        r = self.client.post('/api/grabaciones/', {
            'archivos': [{'nombre_archivo': 'reunion.m4a', 'tamano_bytes': len(audio)}],
            'contexto': {'lugar': 'Sala', 'hora_inicio': '14:00', 'hora_final': '15:00'},
        }, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        pid = r.data['id']
        self.assertEqual(r.data['estado'], 'SUBIENDO')
        self.assertNotIn('ruta', r.data['partes'][0])

        self.assertEqual(self._subir(pid, 0, audio[:1000]).data['recibido_bytes'], 1000)
        # Reintento de un trozo ya recibido: el servidor indica desde dónde seguir, sin duplicar.
        self.assertEqual(self._subir(pid, 0, audio[:1000]).data['recibido_bytes'], 1000)
        self.assertEqual(self._subir(pid, 1000, audio[1000:]).data['estado'], 'EN_COLA')

        from .infraestructura import contenedor
        ruta = contenedor.repo.obtener(pid).partes[0]['ruta']
        with open(ruta, 'rb') as f:
            self.assertEqual(f.read(), audio)

        self.assertEqual(self._procesar(), 1)
        r = self.client.get(f'/api/grabaciones/{pid}/')
        self.assertEqual(r.data['estado'], 'LISTO', r.data['mensaje'])
        self.assertEqual([s['hablante'] for s in r.data['segmentos']], ['Hablante 1', 'Hablante 2'])
        # La IA de prueba no encontró nada de "Prácticas": el punto se quita y se avisa.
        self.assertEqual(r.data['propuesta']['orden_dia'], ['Plan de estudios'])
        self.assertEqual(len(r.data['propuesta']['avisos']), 1)
        self.assertEqual(r.data['proveedor_redaccion'], 'IA de prueba')
        import os
        self.assertFalse(os.path.exists(ruta), 'el audio se borra tras transcribir')

        # Volver a redactar con nombres reales: no vuelve a transcribir.
        r = self.client.post(f'/api/grabaciones/{pid}/redactar/', {'nombres_hablantes': {'Hablante 1': 'Laura'}}, format='json')
        self.assertEqual(r.data['estado'], 'EN_COLA')
        self._procesar()
        r = self.client.get(f'/api/grabaciones/{pid}/')
        self.assertEqual(r.data['estado'], 'LISTO')
        self.assertEqual(r.data['nombres_hablantes'], {'Hablante 1': 'Laura'})
        self.assertEqual(self.transcriptor.llamadas, 1)

    def test_varios_audios_se_unen_en_orden_con_hablantes_consistentes(self):
        r = self.client.post('/api/grabaciones/', {'archivos': [
            {'nombre_archivo': 'parte1.mp3', 'tamano_bytes': 3},
            {'nombre_archivo': 'parte2.mp3', 'tamano_bytes': 2},
        ]}, format='json')
        pid = r.data['id']
        self.assertEqual(r.data['nombre_archivo'], '2 archivos de audio')
        self.assertEqual(self._subir(pid, 0, b'abc', parte=0).data['estado'], 'SUBIENDO')
        self.assertEqual(self._subir(pid, 0, b'de', parte=1).data['estado'], 'EN_COLA')
        self._procesar()

        r = self.client.get(f'/api/grabaciones/{pid}/')
        segs = r.data['segmentos']
        self.assertEqual(len(self.identificador.rutas), 2, 'las voces se analizan sobre todas las partes juntas')
        self.assertEqual([s['parte'] for s in segs], [0, 0, 1, 1])
        self.assertEqual([s['inicio'] for s in segs], [0, 5, 10, 15], 'los tiempos de la parte 2 continúan tras la parte 1')
        self.assertEqual([s['hablante'] for s in segs], ['Hablante 1', 'Hablante 2', 'Hablante 1', 'Hablante 2'])
        self.assertEqual(r.data['duracion_segundos'], 20)

    def test_transcripciones_en_varias_partes(self):
        r = self.client.post('/api/grabaciones/', {'textos': [
            'Orador 1: Abrimos la sesión.\nLaura Gómez: Gracias.', 'Orador 1: Seguimos tras la pausa.',
        ]}, format='json')
        self.assertEqual(r.data['estado'], 'EN_COLA')
        self.assertTrue(r.data['es_texto'])
        self._procesar()
        r = self.client.get(f"/api/grabaciones/{r.data['id']}/")
        self.assertEqual(r.data['estado'], 'LISTO')
        self.assertEqual([s['hablante'] for s in r.data['segmentos']],
                         ['Parte 1 · Orador 1', 'Laura Gómez', 'Parte 2 · Orador 1'])

    def test_quitar_durante_el_proceso_lo_cancela_y_borra_todo(self):
        r = self.client.post('/api/grabaciones/', {'archivos': [{'nombre_archivo': 'larga.mp3', 'tamano_bytes': 4}]}, format='json')
        pid = r.data['id']
        self._subir(pid, 0, b'abcd')
        from .infraestructura import contenedor
        ruta = contenedor.repo.obtener(pid).partes[0]['ruta']
        prueba = self

        class TranscriptorQueEsQuitado(TranscriptorFalso):
            def transcribir(self, ruta_audio, avance):
                avance(0.1)
                # A mitad de la transcripción la persona pulsa "Quitar grabación".
                prueba.assertEqual(prueba.client.delete(f'/api/grabaciones/{pid}/').status_code, 204)
                avance(0.2)  # aquí debe detenerse
                raise AssertionError('no debió continuar')

        self.transcriptor = TranscriptorQueEsQuitado()
        self._procesar()
        import os
        self.assertIsNone(contenedor.repo.obtener(pid))
        self.assertFalse(os.path.exists(ruta))
        self.assertEqual(self.client.get(f'/api/grabaciones/{pid}/').status_code, 404)

    def test_posicion_en_cola(self):
        a = self.client.post('/api/grabaciones/', {'texto': 'Uno.'}, format='json').data
        b = self.client.post('/api/grabaciones/', {'texto': 'Dos.'}, format='json').data
        self.assertEqual(a['posicion_en_cola'], 0)
        self.assertEqual(b['posicion_en_cola'], 1)
        self._procesar()
        self.assertEqual(self.client.get(f"/api/grabaciones/{b['id']}/").data['estado'], 'LISTO')

    def test_validaciones_y_permisos(self):
        r = self.client.post('/api/grabaciones/', {'nombre_archivo': 'x.exe', 'tamano_bytes': 10}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.client.post('/api/grabaciones/', {'archivos': [{'nombre_archivo': 'a.mp3', 'tamano_bytes': 1}], 'textos': ['hola']}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.client.post('/api/grabaciones/', {'nombre_archivo': 'x.mp3', 'tamano_bytes': 10}, format='json')
        pid = r.data['id']
        self.assertEqual(self._subir(pid, 0, b'X' * 11).status_code, 400)  # más de lo declarado
        self.assertEqual(self._subir(pid, 0, b'X', parte=3).status_code, 400)  # parte inexistente

        intruso = APIClient()
        intruso.force_authenticate(self.otro)
        self.assertEqual(intruso.get(f'/api/grabaciones/{pid}/').status_code, 403)
        self.assertEqual(intruso.delete(f'/api/grabaciones/{pid}/').status_code, 403)
        self.assertEqual(intruso.put(f'/api/grabaciones/{pid}/contenido/?offset=0', data=b'X',
                                     content_type='application/octet-stream').status_code, 403)

        estudiante = get_user_model().objects.create_user(username='est', password='x', role='STUDENT')
        cliente_est = APIClient()
        cliente_est.force_authenticate(estudiante)
        self.assertEqual(cliente_est.post('/api/grabaciones/', {'texto': 'hola'}, format='json').status_code, 403)

    def test_fallo_de_la_ia_conserva_la_transcripcion(self):
        class IAQueFalla(IAFalsa):
            def completar(self, prompt, formato_json=False):
                raise RuntimeError('Ollama no está encendido')
        from .infraestructura import contenedor
        with mock.patch.object(contenedor, 'modelo_lenguaje', lambda: IAQueFalla()):
            r = self.client.post('/api/grabaciones/', {'texto': 'Abrimos la sesión.'}, format='json')
            self._procesar()
        r = self.client.get(f"/api/grabaciones/{r.data['id']}/")
        self.assertEqual(r.data['estado'], 'ERROR')
        self.assertIn('Ollama no está encendido', r.data['mensaje'])
        self.assertTrue(r.data['tiene_transcripcion'])
