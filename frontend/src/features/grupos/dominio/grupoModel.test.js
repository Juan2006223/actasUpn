import test from 'node:test';
import assert from 'node:assert/strict';
import { validarGrupo, paginarGrupos, resolverNombreAsesor } from './grupoModel.js';

test('grupoModel - validarGrupo exige nombre y fecha', () => {
    const g = validarGrupo({ name: ' 2026-1 ', date: '2026-02-01' });
    assert.equal(g.name, '2026-1');
    assert.throws(() => validarGrupo({ name: '', date: '2026-02-01' }), /nombre/);
    assert.throws(() => validarGrupo({ name: '2026-1', date: '' }), /fecha/);
});

test('grupoModel - paginarGrupos y resolverNombreAsesor', () => {
    const items = Array.from({ length: 15 }, (_, i) => ({ id: i + 1, name: `G-${i + 1}` }));
    const { totalPages, pageData } = paginarGrupos(items, 2, 10);
    assert.equal(totalPages, 2);
    assert.equal(pageData.length, 5);
    assert.equal(resolverNombreAsesor({ advisor_id: 5 }, [{ id: 5, first_name: 'Luis', last_name: 'Diaz' }]), 'Luis Diaz');
});
