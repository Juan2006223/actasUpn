export const ROLES_DISPONIBLES = [
    {
        id: 'ADMIN',
        label: 'SUPERADMINISTRADOR',
        subtitulo: 'Gobierno y control del sistema',
        nombre: 'Administrador del Sistema',
        badge: 'bg-rose-50 text-rose-700 border-rose-200/80',
        stakeholder: 'Dirección de Sistemas, Secretaría General & Gobierno Institucional',
        permisos: [
            'Control integral de actas académicas y administrativas (FOR023GDC).',
            'Administración del directorio, asignación de roles RBAC y activación de cuentas.',
            'Auditoría de firmas, trazabilidad de acuerdos y exportación oficial.',
        ],
    },
    {
        id: 'SUPERVISOR',
        label: 'SUPERVISOR',
        subtitulo: 'Supervisión de actas y contratos',
        nombre: 'Supervisor Institucional / de Procesos',
        badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
        stakeholder: 'Supervisión de Contratos, Convenios y Gestión Administrativa',
        permisos: [
            'Creación, revisión y aval de actas administrativas y de supervisión (FOR023GDC).',
            'Seguimiento al cumplimiento de compromisos, entregables y plazos pactados.',
            'Validación de firmas de interventoría, contratistas y equipos de trabajo.',
        ],
    },
    {
        id: 'COORDINADOR',
        label: 'COORDINADOR',
        subtitulo: 'Coordinación académica / administrativa',
        nombre: 'Coordinador Académico / Administrativo',
        badge: 'bg-amber-50 text-amber-700 border-amber-200/80',
        stakeholder: 'Coordinaciones de Programa, Departamento y Comités Institucionales',
        permisos: [
            'Apertura, conducción y cierre de actas de comité, consejo y coordinación (FOR023GDC).',
            'Conformación de grupos/cohortes, asignación de asesores y citación de participantes.',
            'Consolidación de acuerdos estratégicos y verificación de quórum por sesión.',
        ],
    },
    {
        id: 'TEACHER',
        label: 'DOCENTE',
        subtitulo: 'Perfil docente vinculado',
        nombre: 'Docente / Asesor Institucional',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        stakeholder: 'Cuerpo Docente y Asesores de Práctica / Cohorte',
        permisos: [
            'Creación, edición y firma de actas de reunión y asesoría (FOR023GDC).',
            'Registro de asistentes, compromisos y orden del día por sesión.',
            'Consulta de grupos asignados e historial documental de sus cohortes.',
        ],
    },
    {
        id: 'APOYO',
        label: 'APOYO',
        subtitulo: 'Profesional de apoyo a la gestión',
        nombre: 'Profesional de Apoyo a la Gestión',
        badge: 'bg-cyan-50 text-cyan-700 border-cyan-200/80',
        stakeholder: 'Equipos de Apoyo Académico, Calidad y Gestión Documental',
        permisos: [
            'Estructuración y redacción técnica de actas administrativas y académicas (FOR023GDC).',
            'Sistematización de compromisos, anexos y soportes de asistencia.',
            'Apoyo transversal a coordinaciones, supervisores y docentes en sesiones oficiales.',
        ],
    },
    {
        id: 'ASISTENTE',
        label: 'ASISTENTE',
        subtitulo: 'Secretaría y asistencia de actas',
        nombre: 'Asistente Administrativo / Secretaría de Actas',
        badge: 'bg-purple-50 text-purple-700 border-purple-200/80',
        stakeholder: 'Secretaría Ejecutiva y Asistencia de Dependencias UPN',
        permisos: [
            'Transcripción, numeración consecutiva y preparación del formato FOR023GDC.',
            'Control de citaciones, registro de orden del día y recolección de firmas.',
            'Archivo y organización cronológica de la memoria institucional de reuniones.',
        ],
    },
    {
        id: 'STUDENT',
        label: 'ESTUDIANTE',
        subtitulo: 'Participante de cohorte / sesión',
        nombre: 'Estudiante / Participante de Sesión',
        badge: 'bg-blue-50 text-brand-blue border-blue-200/80',
        stakeholder: 'Estudiantes, Monitores e Invitados del Directorio Institucional',
        permisos: [
            'Registro de asistencia y firma de participación en sesiones y asesorías (FOR023GDC).',
            'Consulta de compromisos asignados y acuerdos de su cohorte o comité.',
        ],
    },
];

export function obtenerConfigRol(rolCodigo) {
    return ROLES_DISPONIBLES.find((r) => r.id === rolCodigo) || ROLES_DISPONIBLES[3];
}

export const ROLES_CODIGOS_VALIDOS = ROLES_DISPONIBLES.map((r) => r.id);

export function calcularResumenRoles(usuarios = []) {
    const lista = Array.isArray(usuarios) ? usuarios : [];
    const activos = lista.filter((u) => u.is_active !== false);
    const pendientes = lista.filter((u) => u.is_active === false);
    return {
        total: activos.length,
        admins: activos.filter((u) => ['ADMIN', 'SUPERVISOR', 'COORDINADOR'].includes(u.role)).length,
        docentes: activos.filter((u) => ['TEACHER', 'APOYO', 'ASISTENTE'].includes(u.role)).length,
        pendientesInvitaciones: pendientes.length,
    };
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
        return nombre.includes(q) || email.includes(q) || doc.includes(q) || username.includes(q);
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
        const [nombres = '', apellidos = '', numeroDocumento = '', emailInstitucional = '', rolRaw = 'TEACHER'] = cols;
        const errores = [];
        if (!numeroDocumento) errores.push('Sin documento.');
        if (!emailInstitucional || !emailInstitucional.includes('@')) errores.push('Correo inválido.');
        const rolUpper = rolRaw.toUpperCase();
        const role = ROLES_CODIGOS_VALIDOS.includes(rolUpper) ? rolUpper : 'TEACHER';

        return {
            linea: idx + 2,
            nombres,
            apellidos,
            numeroDocumento,
            emailInstitucional,
            role,
            errores,
        };
    });
}
