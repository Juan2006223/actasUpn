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
