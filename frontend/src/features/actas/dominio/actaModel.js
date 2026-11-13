export const ROLE_ES = {
    ADMIN: 'Superadministrador',
    SUPERVISOR: 'Supervisor',
    COORDINADOR: 'Coordinador',
    COORDINATOR: 'Coordinador',
    TEACHER: 'Docente',
    APOYO: 'Apoyo',
    ASISTENTE: 'Asistente',
    STUDENT: 'Estudiante',
};

export const mkActa = () => ({
    isNew: true,
    borrador: true,
    tipo: 'ACTA',
    numero: '',
    anio: '',
    fecha: '',
    hora_inicio: '',
    hora_final: '',
    instancias: '',
    lugar: '',
    asistentes: [{ nombre: '', cargo: '', email: '', user_id: null, foto: '' }],
    ausentes: [{ nombre: 'N/A', cargo: '', email: '', user_id: null, foto: '' }],
    invitados: [{ nombre: 'N/A', cargo: '', email: '', user_id: null, foto: '' }],
    orden_dia: '',
    desarrollo: '',
    compromisos: [{ compromiso: '', responsable: '', responsable_id: null, fecha: '' }],
    proxima_convocatoria: 'N/A',
    anexos: 'N/A',
    firmas: [],
    comentarios: [],
});

export function sincronizarFirmasConParticipantes(acta) {
    const people = [...(acta.asistentes || []), ...(acta.invitados || [])]
        .filter(r => r.nombre && r.nombre !== 'N/A' && r.nombre.trim() !== '');
    const existingFirmas = acta.firmas || [];
    const existingKeys = new Set(existingFirmas.map(f => f.user_id || f.nombre).filter(Boolean));
    const toAdd = people
        .filter(r => {
            const key = r.user_id || r.nombre;
            return key && !existingKeys.has(key);
        })
        .map(r => ({ nombre: r.nombre, firma: '', user_id: r.user_id || null, firmado: false, fecha: '' }));
    return [...existingFirmas, ...toAdd];
}

export function importarCursoEnActa(acta, course, target) {
    if (!target || !course?.students?.length) return acta;
    const resolveName = (s) => `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.full_name || s.username || '';
    if (target === 'firmas_import') {
        const newFirmas = course.students.map(s => ({
            nombre: resolveName(s),
            firma: '', user_id: s.id || null, firmado: false, fecha: ''
        })).filter(f => f.nombre);
        const keys = new Set((acta.firmas || []).map(f => f.user_id || f.nombre).filter(Boolean));
        return {
            ...acta,
            instancias: acta.instancias || course.name || '',
            firmas: [...(acta.firmas || []), ...newFirmas.filter(f => !keys.has(f.user_id || f.nombre))]
        };
    }
    const targetField = target === 'grupo_completo' ? 'asistentes' : target;
    const newRows = course.students.map(s => ({
        nombre: resolveName(s),
        cargo: ROLE_ES[s.role] || s.role || '',
        email: s.email || '',
        user_id: s.id || null,
        foto: s.photo || ''
    })).filter(r => r.nombre);
    const existing = (acta[targetField] || []).filter(r => r.nombre && r.nombre !== 'N/A' && r.nombre.trim() !== '');
    const keys = new Set(existing.map(r => r.user_id || r.nombre).filter(Boolean));
    const mergedRows = [...existing, ...newRows.filter(r => !keys.has(r.user_id || r.nombre))];
    const nextActa = {
        ...acta,
        instancias: acta.instancias || course.name || '',
        [targetField]: mergedRows.length ? mergedRows : acta[targetField],
    };
    return {
        ...nextActa,
        firmas: sincronizarFirmasConParticipantes(nextActa),
    };
}

export function agregarMiFirmaEnActa(acta, user) {
    const name = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : '';
    if (!name) return acta;
    if (acta.firmas?.some(f => f.user_id === user?.id || f.nombre === name)) return acta;
    return {
        ...acta,
        firmas: [...(acta.firmas || []), { nombre: name, firma: '', user_id: user?.id, firmado: false, fecha: '' }]
    };
}

export function filtrarMisActas(misActas = [], userId, misFilter = 'todas', misYear = '', misSearch = '') {
    let list = [...misActas];
    if (misFilter === 'pendientes') {
        list = list.filter(a => {
            const e = a.firmas?.find(f => f.user_id && String(f.user_id) === String(userId));
            return !e?.firmado;
        });
    } else if (misFilter === 'firmadas') {
        list = list.filter(a => {
            const e = a.firmas?.find(f => f.user_id && String(f.user_id) === String(userId));
            return e?.firmado === true;
        });
    }
    if (misYear) list = list.filter(a => (a.fecha || '').includes(misYear));
    if (misSearch.trim()) {
        const q = misSearch.toLowerCase();
        list = list.filter(a =>
            [a.numero, a.lugar, a.instancias, a.orden_dia].some(v => (v || '').toLowerCase().includes(q))
        );
    }
    return list;
}

export function calcularPendientesPorFirmar(misActas = [], userId) {
    return misActas.filter(a => {
        const e = a.firmas?.find(f => f.user_id && String(f.user_id) === String(userId));
        return e && !e.firmado;
    }).length;
}

export function extraerAniosDisponibles(actas = [], misActas = []) {
    const years = new Set();
    [...actas, ...misActas].forEach(a => {
        if (a.fecha) {
            const y = a.fecha.split('-')[0];
            if (y) years.add(y);
        }
    });
    return Array.from(years).sort().reverse();
}

export function aplicarFirmaEnActa(acta, userId, firmaData) {
    const firmas = (acta.firmas || []).map(f => {
        if (f.user_id && String(f.user_id) === String(userId)) {
            return { ...f, firma: firmaData, firmado: true, fecha: new Date().toISOString() };
        }
        return f;
    });
    return { ...acta, firmas };
}

export function agregarComentarioEnActa(acta, autorNombre, texto) {
    const comentarios = [
        ...(acta.comentarios || []),
        { autor: autorNombre, texto, fecha: new Date().toISOString() }
    ];
    return { ...acta, comentarios };
}

// ── Autoguardado ──────────────────────────────────────────────

const PREFIJO_BORRADOR = 'acta_borrador';

/** Clave de localStorage del borrador de un usuario para una acta (o 'nueva' si aún no existe en el servidor). */
export function claveBorrador(userId, actaId) {
    return `${PREFIJO_BORRADOR}:${userId ?? 'anon'}:${actaId ?? 'nueva'}`;
}

export function esClaveBorradorDeUsuario(clave, userId) {
    return typeof clave === 'string' && clave.startsWith(`${PREFIJO_BORRADOR}:${userId ?? 'anon'}:`);
}

/** Quita lo que solo usa la interfaz antes de enviar o comparar. */
export function prepararActaParaGuardar(acta) {
    const { isNew, updated_at, ...resto } = acta || {};
    return resto;
}

/** Huella para detectar cambios reales (ignora campos que calcula el servidor). */
export function huellaActa(acta) {
    return JSON.stringify(prepararActaParaGuardar(acta));
}

const vacio = (v) => !v || String(v).trim() === '' || String(v).trim() === 'N/A';

/** Evita crear borradores en el servidor por abrir y cerrar un formulario vacío. */
export function actaTieneContenido(acta) {
    if (!acta) return false;
    if (acta.grabacion_id) return true;
    const campos = ['numero', 'fecha', 'hora_inicio', 'hora_final', 'instancias', 'lugar', 'orden_dia', 'desarrollo'];
    if (campos.some((c) => !vacio(acta[c]))) return true;
    const filas = [...(acta.asistentes || []), ...(acta.ausentes || []), ...(acta.invitados || [])];
    if (filas.some((p) => !vacio(p?.nombre))) return true;
    return (acta.compromisos || []).some((c) => !vacio(c?.compromiso));
}

/** El borrador local sirve solo si es más nuevo que lo guardado en el servidor y tiene cambios. */
export function borradorEsRecuperable(borrador, actaServidor) {
    if (!borrador?.acta || !borrador.guardadoEn) return false;
    if (!actaServidor) return actaTieneContenido(borrador.acta);
    if (huellaActa(borrador.acta) === huellaActa(actaServidor)) return false;
    if (!actaServidor.updated_at) return true;
    return new Date(borrador.guardadoEn) > new Date(actaServidor.updated_at);
}

export function describirBorrador(acta) {
    if (!acta) return 'Acta sin título';
    const partes = [acta.numero ? `Acta ${acta.numero}` : acta.id ? `Acta #${acta.id}` : 'Acta nueva'];
    if (acta.instancias) partes.push(acta.instancias);
    if (acta.fecha) partes.push(acta.fecha);
    return partes.join(' · ');
}

// ── Año del acta ("Acta No. # de Año") ─────────────────────────

export function anioDeFecha(fecha) {
    return /^\d{4}-\d{2}-\d{2}$/.test(fecha || '') ? fecha.slice(0, 4) : '';
}

/** Año a mostrar en el formulario. Las actas anteriores guardaban este dato en "total". */
export function anioDelActa(acta) {
    if (acta?.anio !== undefined) return acta.anio;
    // Solo si parece un año: antes el campo se llamaba "Total de actas" y pudo llenarse con otra cosa.
    const total = /^\d{4}$/.test(String(acta?.total || '').trim()) ? String(acta.total).trim() : '';
    return total || anioDeFecha(acta?.fecha);
}

/** Año para imprimir: si quedó vacío, se usa el de la fecha. */
export function anioParaImprimir(acta) {
    return anioDelActa(acta) || anioDeFecha(acta?.fecha);
}

/** Al cambiar la fecha, el año la sigue, salvo que la persona lo haya escrito a mano con otro valor. */
export function cambiarFechaActa(acta, fecha) {
    const anioActual = anioDelActa(acta);
    const automatico = !anioActual || anioActual === anioDeFecha(acta.fecha);
    return { ...acta, fecha, anio: automatico ? (anioDeFecha(fecha) || anioActual) : anioActual };
}
