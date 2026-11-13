import test from 'node:test';
import assert from 'node:assert/strict';
import {
    mkActa, sincronizarFirmasConParticipantes, filtrarMisActas,
    calcularPendientesPorFirmar, aplicarFirmaEnActa
} from './actaModel.js';

test('actaModel - mkActa y sincronizacion de firmas', () => {
    const acta = mkActa();
    acta.asistentes = [{ nombre: 'Carlos Ruiz', user_id: 10 }];
    const firmas = sincronizarFirmasConParticipantes(acta);
    assert.equal(firmas.length, 1);
    assert.equal(firmas[0].user_id, 10);
    assert.equal(firmas[0].firmado, false);
});

test('actaModel - aplicar firma y calcular pendientes', () => {
    const acta = {
        id: 1,
        numero: '001',
        fecha: '2026-10-24',
        firmas: [{ nombre: 'Carlos Ruiz', user_id: 10, firmado: false, firma: '' }]
    };
    assert.equal(calcularPendientesPorFirmar([acta], 10), 1);
    const firmada = aplicarFirmaEnActa(acta, 10, 'data:image/png;base64,abc');
    assert.equal(calcularPendientesPorFirmar([firmada], 10), 0);
    assert.equal(filtrarMisActas([firmada], 10, 'firmadas').length, 1);
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
