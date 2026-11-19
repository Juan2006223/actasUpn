import test from 'node:test';
import assert from 'node:assert/strict';
import {
    calcularResumenRoles,
    filtrarUsuarios,
    validarNuevoUsuario,
    analizarDirectorioCSV,
    ROLES_DISPONIBLES,
    cargoYDependencia,
} from './usuarioModel.js';

const mockUsers = [
    { id: 1, first_name: 'Carlos', last_name: 'Rojas', email: 'admin@upn.edu.co', role: 'ADMIN', document_number: '79001', is_active: true },
    { id: 2, first_name: 'Marta', last_name: 'Diaz', email: 'mdiaz@upn.edu.co', role: 'REDACTOR', document_number: '52002', is_active: true },
    { id: 3, first_name: 'Pedro', last_name: 'Gomez', email: 'pgomez@upn.edu.co', role: 'REVISOR', document_number: '10103', is_active: true },
    { id: 4, first_name: 'Luisa', last_name: 'Paz', email: 'lpaz@upn.edu.co', role: 'REDACTOR', document_number: '10104', is_active: false },
];

test('usuarioModel - roles de plataforma: superadmin, revisor y redactor', () => {
    assert.deepEqual(ROLES_DISPONIBLES.map((r) => r.id).sort(), ['ADMIN', 'REDACTOR', 'REVISOR']);
    const res = calcularResumenRoles(mockUsers);
    assert.deepEqual(res, { total: 3, admins: 1, revisores: 1, redactores: 1, pendientesInvitaciones: 1 });
    assert.equal(filtrarUsuarios(mockUsers, 'Marta', 'TODOS').length, 1);
    assert.equal(filtrarUsuarios(mockUsers, '', 'REVISOR').length, 1);
    assert.equal(filtrarUsuarios([{ cargo: 'Director', dependencia_nombre: 'CINNDET' }], 'cinndet').length, 1);
    assert.equal(cargoYDependencia({ cargo: 'Director', dependencia_nombre: 'CINNDET' }), 'Director · CINNDET');
    assert.equal(cargoYDependencia({ cargo: '', dependencia_nombre: '' }), '');
});

test('usuarioModel - valida creacion de usuario y parseo CSV con nuevos roles', () => {
    assert.equal(validarNuevoUsuario({ document_number: '', email: 'a@b.co' }).valido, false);
    assert.equal(validarNuevoUsuario({ document_number: '123', email: 'docente@upn.edu.co' }).valido, true);

    const csv = [
        'NOMBRES,APELLIDOS,DOCUMENTO,CORREO,CARGO,DEPENDENCIA,ROL',
        'Ana,Lopez,102030,ana@upn.edu.co,Docente,CINNDET,REVISOR',
        'Luis,Paz,1,l@upn.edu.co',
    ].join('\n');
    const filas = analizarDirectorioCSV(csv);
    assert.equal(filas.length, 2);
    assert.deepEqual([filas[0].cargo, filas[0].dependencia, filas[0].role], ['Docente', 'CINNDET', 'REVISOR']);
    assert.equal(filas[1].role, 'REDACTOR');
});
