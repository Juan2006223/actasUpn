import test from 'node:test';
import assert from 'node:assert/strict';
import {
    calcularResumenRoles,
    filtrarUsuarios,
    validarNuevoUsuario,
    analizarDirectorioCSV,
    ROLES_DISPONIBLES,
} from './usuarioModel.js';

const mockUsers = [
    { id: 1, first_name: 'Carlos', last_name: 'Rojas', email: 'admin@upn.edu.co', role: 'ADMIN', document_number: '79001', is_active: true },
    { id: 2, first_name: 'Marta', last_name: 'Diaz', email: 'mdiaz@upn.edu.co', role: 'TEACHER', document_number: '52002', is_active: true },
    { id: 3, first_name: 'Pedro', last_name: 'Gomez', email: 'pgomez@upn.edu.co', role: 'SUPERVISOR', document_number: '10103', is_active: true },
    { id: 4, first_name: 'Luisa', last_name: 'Paz', email: 'lpaz@upn.edu.co', role: 'APOYO', document_number: '10104', is_active: false },
];

test('usuarioModel - incluye roles administrativos y academicos para actas FOR023GDC', () => {
    const codigos = ROLES_DISPONIBLES.map((r) => r.id);
    assert.equal(codigos.includes('SUPERVISOR'), true);
    assert.equal(codigos.includes('COORDINADOR'), true);
    assert.equal(codigos.includes('APOYO'), true);
    assert.equal(codigos.includes('ASISTENTE'), true);
    const res = calcularResumenRoles(mockUsers);
    assert.deepEqual(res, { total: 3, admins: 2, docentes: 1, pendientesInvitaciones: 1 });
    assert.equal(filtrarUsuarios(mockUsers, 'Marta', 'TODOS').length, 1);
    assert.equal(filtrarUsuarios(mockUsers, '', 'SUPERVISOR').length, 1);
});

test('usuarioModel - valida creacion de usuario y parseo CSV con nuevos roles', () => {
    assert.equal(validarNuevoUsuario({ document_number: '', email: 'a@b.co' }).valido, false);
    assert.equal(validarNuevoUsuario({ document_number: '123', email: 'docente@upn.edu.co' }).valido, true);

    const csv = 'NOMBRES,APELLIDOS,DOCUMENTO,CORREO INSTITUCIONAL,ROL\nAna,Lopez,102030,ana@upn.edu.co,COORDINADOR';
    const filas = analizarDirectorioCSV(csv);
    assert.equal(filas.length, 1);
    assert.equal(filas[0].role, 'COORDINADOR');
});
