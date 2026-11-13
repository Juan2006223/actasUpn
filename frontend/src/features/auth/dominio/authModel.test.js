import test from 'node:test';
import assert from 'node:assert/strict';
import {
    validarCredenciales,
    esEstudiante,
    esAdmin,
    puedeGestionarGrupos,
    obtenerNombreCompleto,
} from './authModel.js';

test('authModel - validarCredenciales rechaza vacios y limpia espacios', () => {
    assert.throws(() => validarCredenciales('', '123'));
    assert.throws(() => validarCredenciales('user', '   '));
    const res = validarCredenciales('  admin ', ' 1234 ');
    assert.deepEqual(res, { username: 'admin', password: '1234' });
});

test('authModel - roles, permisos de grupos/usuarios y nombre completo', () => {
    assert.equal(esEstudiante({ role: 'STUDENT' }), true);
    assert.equal(esAdmin({ role: 'ADMIN' }), true);
    assert.equal(esAdmin({ role: 'COORDINADOR' }), false);
    assert.equal(puedeGestionarGrupos({ role: 'SUPERVISOR' }), true);
    assert.equal(puedeGestionarGrupos({ role: 'COORDINADOR' }), true);
    assert.equal(puedeGestionarGrupos({ role: 'TEACHER' }), true);
    assert.equal(puedeGestionarGrupos({ role: 'ASISTENTE' }), false);
    assert.equal(obtenerNombreCompleto({ first_name: 'Ana', last_name: 'Gomez' }), 'Ana Gomez');
});

test('authModel - inactividad: avisa 1 minuto antes y vence a las 3 horas', async () => {
    const { estadoInactividad, segundosRestantes, INACTIVIDAD_MAX_MS } = await import('./authModel.js');
    const t0 = 1_000_000;
    assert.equal(estadoInactividad(t0, t0 + 60_000), 'activa');
    assert.equal(estadoInactividad(t0, t0 + INACTIVIDAD_MAX_MS - 30_000), 'aviso');
    assert.equal(estadoInactividad(t0, t0 + INACTIVIDAD_MAX_MS), 'vencida');
    assert.equal(estadoInactividad(null, t0), 'activa'); // sin registro aún: no se cierra
    assert.equal(segundosRestantes(t0, t0 + INACTIVIDAD_MAX_MS - 30_000), 30);
});
