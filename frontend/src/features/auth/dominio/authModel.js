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

// ── Cierre de sesión por inactividad ──
export const INACTIVIDAD_MAX_MS = 3 * 60 * 60 * 1000; // 3 horas sin usar el aplicativo
export const AVISO_ANTES_MS = 60 * 1000; // se avisa 1 minuto antes

/** 'activa' | 'aviso' | 'vencida', según cuánto lleva la persona sin usar el aplicativo. */
export function estadoInactividad(ultimaActividad, ahora, limite = INACTIVIDAD_MAX_MS, aviso = AVISO_ANTES_MS) {
    const ultima = Number(ultimaActividad);
    if (!Number.isFinite(ultima) || ultima <= 0) return 'activa';
    const inactivo = ahora - ultima;
    if (inactivo >= limite) return 'vencida';
    if (inactivo >= limite - aviso) return 'aviso';
    return 'activa';
}

export function segundosRestantes(ultimaActividad, ahora, limite = INACTIVIDAD_MAX_MS) {
    return Math.max(0, Math.ceil((Number(ultimaActividad) + limite - ahora) / 1000));
}

export const MOTIVOS_SALIDA = {
    inactividad: 'Tu sesión se cerró porque pasaron 3 horas sin usar el aplicativo. Tu avance quedó guardado.',
    expirada: 'Tu sesión expiró. Vuelve a iniciar sesión; tu avance quedó guardado.',
};
