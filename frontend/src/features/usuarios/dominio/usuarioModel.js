export const ROLES_DISPONIBLES = [
    {
        id: 'REDACTOR',
        label: 'REDACTOR',
        nombre: 'Redactor',
        subtitulo: 'Rol por defecto',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        permisos: [
            'Crea actas y las edita mientras están en borrador.',
            'Envía sus actas a revisión o las publica directamente para firmas.',
            'En las actas de otras personas solo firma y deja observaciones.',
        ],
    },
    {
        id: 'REVISOR',
        label: 'REVISOR',
        nombre: 'Revisor',
        subtitulo: 'Revisa las actas de su dependencia',
        badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
        permisos: [
            'Todo lo que hace un redactor.',
            'Ve y corrige las actas creadas por personas de su dependencia.',
            'Aprueba las actas enviadas a revisión o las devuelve con una observación.',
        ],
    },
    {
        id: 'ADMIN',
        label: 'SUPERADMINISTRADOR',
        nombre: 'Superadministrador',
        subtitulo: 'Gestión completa del sistema',
        badge: 'bg-rose-50 text-rose-700 border-rose-200/80',
        permisos: [
            'Ve, corrige y elimina cualquier acta.',
            'Crea usuarios y asigna rol, cargo y dependencia.',
            'Administra la lista de dependencias.',
        ],
    },
];

export const ROL_POR_DEFECTO = 'REDACTOR';

export function obtenerConfigRol(rolCodigo) {
    return ROLES_DISPONIBLES.find((r) => r.id === rolCodigo) || ROLES_DISPONIBLES[0];
}

export const ROLES_CODIGOS_VALIDOS = ROLES_DISPONIBLES.map((r) => r.id);

export function calcularResumenRoles(usuarios = []) {
    const lista = Array.isArray(usuarios) ? usuarios : [];
    const activos = lista.filter((u) => u.is_active !== false);
    const pendientes = lista.filter((u) => u.is_active === false);
    return {
        total: activos.length,
        admins: activos.filter((u) => u.role === 'ADMIN').length,
        revisores: activos.filter((u) => u.role === 'REVISOR').length,
        redactores: activos.filter((u) => u.role === 'REDACTOR').length,
        pendientesInvitaciones: pendientes.length,
    };
}

/** "Director · CINNDET": lo que se muestra como cargo/dependencia en tablas y actas. */
export function cargoYDependencia(usuario) {
    return [usuario?.cargo, usuario?.dependencia_nombre || usuario?.dependencia]
        .map((v) => String(v || '').trim())
        .filter(Boolean)
        .join(' · ');
}

export function filtrarUsuarios(usuarios = [], busqueda = '', rolFiltro = 'TODOS') {
    const lista = Array.isArray(usuarios) ? usuarios : [];
    const q = String(busqueda || '').trim().toLowerCase();

    return lista.filter((u) => {
        const coincideRol = rolFiltro === 'TODOS' || u.role === rolFiltro;
        if (!coincideRol) return false;
        if (!q) return true;
        const nombre = `${u.first_name || ''} ${u.last_name || ''} ${u.full_name || ''}`.toLowerCase();
        const email = String(u.email || '').toLowerCase();
        const doc = String(u.document_number || '').toLowerCase();
        const username = String(u.username || '').toLowerCase();
        const cargo = cargoYDependencia(u).toLowerCase();
        return nombre.includes(q) || email.includes(q) || doc.includes(q) || username.includes(q) || cargo.includes(q);
    });
}

export function validarNuevoUsuario(datos = {}) {
    const doc = String(datos.document_number || '').trim();
    const email = String(datos.email || '').trim();
    if (!doc) {
        return { valido: false, error: 'El número de cédula o documento es obligatorio.' };
    }
    if (!email || !email.includes('@')) {
        return { valido: false, error: 'Ingresa un correo institucional válido.' };
    }
    return { valido: true, error: null };
}

export function analizarDirectorioCSV(contenido = '') {
    const lineas = String(contenido || '')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
    if (lineas.length <= 1) return [];

    return lineas.slice(1).map((linea, idx) => {
        const cols = linea.split(/[,;]/).map((c) => c.trim());
        // Columnas: NOMBRES, APELLIDOS, DOCUMENTO, CORREO, CARGO, DEPENDENCIA, ROL (las tres últimas opcionales).
        const [nombres = '', apellidos = '', numeroDocumento = '', emailInstitucional = '', cargo = '', dependencia = '', rolRaw = ''] = cols;
        const errores = [];
        if (!numeroDocumento) errores.push('Sin documento.');
        if (!emailInstitucional || !emailInstitucional.includes('@')) errores.push('Correo inválido.');
        const rolUpper = rolRaw.toUpperCase();
        const role = ROLES_CODIGOS_VALIDOS.includes(rolUpper) ? rolUpper : ROL_POR_DEFECTO;

        return {
            linea: idx + 2,
            nombres,
            apellidos,
            numeroDocumento,
            emailInstitucional,
            cargo,
            dependencia,
            role,
            errores,
        };
    });
}
