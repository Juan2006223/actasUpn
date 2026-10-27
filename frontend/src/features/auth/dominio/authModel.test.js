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
