import test from 'node:test';
import assert from 'node:assert/strict';
import { mkActa } from './actaModel.js';
import {
    siguienteParte, extensionPermitida, contextoDesdeActa, hablantesDe, intervenciones,
    transcripcionComoTexto, aplicarPropuestaEnActa, camposQueSeReemplazan, personasNuevas, indiceEtapa,
} from './grabacionModel.js';

const propuesta = {
    orden_dia: ['Plan de estudios', 'Prácticas'],
    desarrollo: 'PUNTO 1. PLAN DE ESTUDIOS\nTexto',
    compromisos: [{ compromiso: 'Enviar programa', responsable: 'Carlos Ruiz', fecha: '2026-11-20' }],
    proxima_convocatoria: '5 de diciembre',
    asistentes_mencionados: [{ nombre: 'Laura Gómez', cargo: 'Coordinadora' }, { nombre: 'Carlos Ruiz', cargo: '' }],
};

test('grabacionModel - partes de subida', () => {
    assert.deepEqual(siguienteParte(20, 0, 8), { inicio: 0, fin: 8 });
    assert.deepEqual(siguienteParte(20, 16, 8), { inicio: 16, fin: 20 });
    assert.equal(siguienteParte(20, 20, 8), null);
    assert.ok(extensionPermitida('Reunión.MP3', ['mp3']));
    assert.ok(!extensionPermitida('mp3', ['mp3']));
});

test('grabacionModel - contexto solo con personas reales', () => {
    const acta = { ...mkActa(), lugar: 'Sala', asistentes: [{ nombre: 'Ana', cargo: 'Docente', foto: 'x' }, { nombre: '' }] };
    const ctx = contextoDesdeActa(acta);
    assert.deepEqual(ctx.asistentes, [{ nombre: 'Ana', cargo: 'Docente' }]);
    assert.deepEqual(ctx.ausentes, []);
    assert.equal(ctx.lugar, 'Sala');
    assert.equal(ctx.orden_dia, '');
    assert.equal(contextoDesdeActa({ orden_dia: ' 1. Saludo\n2. Varios ' }).orden_dia, '1. Saludo\n2. Varios');
});

test('grabacionModel - hablantes e intervenciones', () => {
    const segs = [
        { inicio: 0, texto: 'Hola.', hablante: 'Hablante 1' },
        { inicio: 2, texto: 'Sigo.', hablante: 'Hablante 1' },
        { inicio: 65, texto: 'Respondo.', hablante: 'Hablante 2' },
    ];
    assert.deepEqual(hablantesDe(segs).map((h) => h.hablante), ['Hablante 1', 'Hablante 2']);
    const lista = intervenciones(segs, { 'Hablante 1': 'Laura' });
    assert.equal(lista.length, 2);
    assert.equal(lista[0].nombre, 'Laura');
    assert.equal(lista[0].texto, 'Hola. Sigo.');
    assert.equal(transcripcionComoTexto(segs, {}), '[0:00] Hablante 1: Hola. Sigo.\n\n[1:05] Hablante 2: Respondo.');
});

test('grabacionModel - aplicar propuesta en acta', () => {
    const acta = { ...mkActa(), asistentes: [{ nombre: 'carlos ruiz', cargo: 'Docente' }] };
    assert.deepEqual(camposQueSeReemplazan(acta), []);
    assert.deepEqual(personasNuevas(acta, propuesta).map((p) => p.nombre), ['Laura Gómez']);

    const r = aplicarPropuestaEnActa(acta, propuesta, { agregarAsistentes: true });
    assert.equal(r.orden_dia, '1. Plan de estudios\n2. Prácticas');
    assert.equal(r.compromisos[0].responsable, 'Carlos Ruiz');
    assert.equal(r.proxima_convocatoria, '5 de diciembre');
    assert.deepEqual(r.asistentes.map((p) => p.nombre), ['carlos ruiz', 'Laura Gómez']);
    assert.deepEqual(camposQueSeReemplazan(r), ['Orden del día', 'Desarrollo', 'Compromisos']);

    const sinAsistentes = aplicarPropuestaEnActa(acta, propuesta);
    assert.equal(sinAsistentes.asistentes.length, 1);
});

test('grabacionModel - etapas', () => {
    assert.equal(indiceEtapa('TRANSCRIBIENDO'), 0);
    assert.equal(indiceEtapa('REDACTANDO'), 2);
    assert.equal(indiceEtapa('LISTO'), 3);
});

import { ordenarArchivos, moverElemento, planDeReanudacion, totalPartes, mensajeCola } from './grabacionModel.js';

test('grabacionModel - varias partes', () => {
    const f = (name, size = 1) => ({ name, size });
    assert.deepEqual(ordenarArchivos([f('reunion parte 10.mp3'), f('reunion parte 2.mp3'), f('Reunion parte 1.mp3')]).map((x) => x.name),
        ['Reunion parte 1.mp3', 'reunion parte 2.mp3', 'reunion parte 10.mp3']);
    assert.deepEqual(moverElemento(['a', 'b', 'c'], 2, -1), ['a', 'c', 'b']);
    assert.deepEqual(moverElemento(['a', 'b'], 0, -1), ['a', 'b']);

    const servidor = [{ nombre: 'p1.mp3', tamano: 10, recibido: 10 }, { nombre: 'p2.mp3', tamano: 8, recibido: 3 }];
    assert.deepEqual(planDeReanudacion(servidor, [f('p1.mp3', 10), f('p2.mp3', 8)]), [10, 3]);
    assert.equal(planDeReanudacion(servidor, [f('p2.mp3', 8), f('p1.mp3', 10)]), null);

    const segs = [
        { inicio: 0, texto: 'Hola.', hablante: 'Parte 1 · Orador 1', parte: 0 },
        { inicio: 1, texto: 'Sigo.', hablante: 'Parte 2 · Orador 1', parte: 1 },
    ];
    assert.equal(totalPartes(segs), 2);
    assert.equal(transcripcionComoTexto(segs, { 'Parte 2 · Orador 1': 'Laura' }, false),
        '=== Parte 1 ===\n\nParte 1 · Orador 1: Hola.\n\n=== Parte 2 ===\n\nLaura: Sigo.');
    assert.match(mensajeCola(1), /1 reunión procesándose/);
});
