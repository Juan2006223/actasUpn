export const ROLES_CREADORES_GRUPOS = ['ADMIN', 'SUPERVISOR', 'COORDINADOR', 'TEACHER'];

export function validarCredenciales(username, password) {
    const u = String(username || '').trim();
    const p = String(password || '').trim();
    if (!u || !p) {
        throw new Error('Las credenciales son obligatorias');
    }
    return { username: u, password: p };
}

export function esEstudiante(user) {
    return user?.role === 'STUDENT';
}

export function esAdmin(user) {
    return user?.role === 'ADMIN';
}

export function puedeGestionarGrupos(user) {
    return ROLES_CREADORES_GRUPOS.includes(user?.role);
}

export function obtenerNombreCompleto(user) {
    if (!user) return '';
    const nombre = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return nombre || user.full_name || user.username || '';
}
