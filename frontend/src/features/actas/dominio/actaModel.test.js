import test from 'node:test';
import assert from 'node:assert/strict';
import {
    mkActa, sincronizarFirmasConParticipantes, filtrarMisActas, calcularPendientesPorFirmar, calcularPorRevisar,
    estadoVisible, accionDeEstado, cargoDePersona,
} from './actaModel.js';

test('actaModel - mkActa y sincronizacion de firmas', () => {
    const acta = mkActa();
    acta.asistentes = [{ nombre: 'Carlos Ruiz', user_id: 10 }];
    const firmas = sincronizarFirmasConParticipantes(acta);
    assert.equal(firmas.length, 1);
    assert.equal(firmas[0].user_id, 10);
    assert.equal(firmas[0].firmado, false);
});

test('actaModel - quien se agrega después a asistentes queda como firmante, sin duplicar', () => {
    const acta = {
        asistentes: [{ nombre: 'Carlos Ruiz', user_id: 10 }, { nombre: 'Nelsón Sánchez', user_id: 6 }, { nombre: 'N/A' }],
        invitados: [{ nombre: '' }],
        firmas: [
            { nombre: 'Carlos Ruiz', user_id: 10, firmado: true, firma: 'x' },
            { nombre: 'nelson sanchez', user_id: null, firmado: false },
        ],
    };
    const firmas = sincronizarFirmasConParticipantes(acta);
    assert.equal(firmas.length, 2);
    assert.equal(firmas[0].firmado, true);
    assert.equal(firmas[1].user_id, 6);
});

test('actaModel - pendientes, revisión y filtros usan los permisos que envía el servidor', () => {
    const porFirmar = { id: 1, estado: 'PARA_FIRMA', permisos: { firmar: true }, firmas: [{ user_id: 10, firmado: false }] };
    const firmada = { id: 2, estado: 'PARA_FIRMA', permisos: { firmar: false }, firmas: [{ user_id: 10, firmado: true }] };
    const enRevision = { id: 3, estado: 'EN_REVISION', permisos: { revisar: true }, firmas: [] };
    const actas = [porFirmar, firmada, enRevision];
    assert.equal(calcularPendientesPorFirmar(actas), 1);
    assert.equal(calcularPorRevisar(actas), 1);
    assert.deepEqual(filtrarMisActas(actas, 10, 'pendientes').map((a) => a.id), [1]);
    assert.deepEqual(filtrarMisActas(actas, 10, 'firmadas').map((a) => a.id), [2]);
    assert.deepEqual(filtrarMisActas(actas, 10, 'revision').map((a) => a.id), [3]);
});

test('actaModel - estado visible y textos de los botones del flujo', () => {
    assert.equal(estadoVisible({ estado: 'PARA_FIRMA', firmas: [{ firmado: true }] }), 'FIRMADA');
    assert.equal(estadoVisible({ estado: 'PARA_FIRMA', firmas: [{ firmado: false }] }), 'PARA_FIRMA');
    assert.equal(estadoVisible({ borrador: true }), 'BORRADOR');
    assert.equal(accionDeEstado({ estado: 'BORRADOR' }, 'PARA_FIRMA', true).texto, 'Publicar para firmas');
    assert.equal(accionDeEstado({ estado: 'EN_REVISION' }, 'PARA_FIRMA', false).texto, 'Aprobar y publicar para firmas');
    assert.equal(accionDeEstado({ estado: 'EN_REVISION' }, 'BORRADOR', false).pideMotivo, true);
    assert.equal(accionDeEstado({ estado: 'EN_REVISION' }, 'BORRADOR', true).texto, 'Retirar de revisión');
    assert.ok(accionDeEstado({ estado: 'PARA_FIRMA' }, 'BORRADOR', true).confirmar);
});

test('actaModel - cargo y dependencia para la tabla de asistentes', () => {
    assert.equal(cargoDePersona({ cargo: 'Director', dependencia_nombre: 'CINNDET' }), 'Director / CINNDET');
    assert.equal(cargoDePersona({ cargo: 'Docente', dependencia: 'Facultad' }), 'Docente / Facultad');
    assert.equal(cargoDePersona({}), '');
});

import {
    claveBorrador, esClaveBorradorDeUsuario, prepararActaParaGuardar,
    actaTieneContenido, borradorEsRecuperable,
} from './actaModel.js';

test('actaModel - autoguardado: claves y limpieza', () => {
    assert.equal(claveBorrador(7, null), 'acta_borrador:7:nueva');
    assert.equal(claveBorrador(7, 15), 'acta_borrador:7:15');
    assert.ok(esClaveBorradorDeUsuario('acta_borrador:7:15', 7));
    assert.ok(!esClaveBorradorDeUsuario('acta_borrador:70:15', 7));
    assert.deepEqual(prepararActaParaGuardar({ id: 1, isNew: false, updated_at: 'x', lugar: 'A' }), { id: 1, lugar: 'A' });
});

test('actaModel - autoguardado: acta vacia no cuenta como contenido', () => {
    assert.equal(actaTieneContenido(mkActa()), false);
    assert.equal(actaTieneContenido({ ...mkActa(), orden_dia: '1. Apertura' }), true);
});

test('actaModel - autoguardado: borrador recuperable solo si es mas nuevo y distinto', () => {
    const servidor = { id: 3, lugar: 'Sala A', updated_at: '2026-11-11T10:00:00Z' };
    const viejo = { acta: { ...servidor, lugar: 'Sala B' }, guardadoEn: '2026-11-11T09:00:00Z' };
    const nuevo = { acta: { ...servidor, lugar: 'Sala B' }, guardadoEn: '2026-11-11T11:00:00Z' };
    const igual = { acta: { ...servidor }, guardadoEn: '2026-11-11T11:00:00Z' };
    assert.equal(borradorEsRecuperable(viejo, servidor), false);
    assert.equal(borradorEsRecuperable(nuevo, servidor), true);
    assert.equal(borradorEsRecuperable(igual, servidor), false);
    assert.equal(borradorEsRecuperable({ acta: mkActa(), guardadoEn: 'x' }, null), false);
});

import { anioDelActa, anioParaImprimir, cambiarFechaActa } from './actaModel.js';

test('actaModel - el año sale de la fecha y se puede corregir', () => {
    let acta = mkActa();
    acta = cambiarFechaActa(acta, '2026-11-11');
    assert.equal(acta.anio, '2026');
    acta = cambiarFechaActa(acta, '2027-01-15');
    assert.equal(acta.anio, '2027', 'sigue a la fecha mientras no se haya cambiado a mano');
    acta = { ...acta, anio: '2026' };
    acta = cambiarFechaActa(acta, '2027-02-01');
    assert.equal(acta.anio, '2026', 'respeta el valor escrito a mano');
    assert.equal(anioParaImprimir({ ...acta, anio: '' }), '2027');
    // Actas anteriores guardaban el dato en "total".
    assert.equal(anioDelActa({ total: '2025', fecha: '2026-03-01' }), '2025');
    assert.equal(anioDelActa({ fecha: '2026-03-01' }), '2026');
});
