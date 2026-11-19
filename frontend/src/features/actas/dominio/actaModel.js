/** Lo que va en la columna "Cargo/Dependencia" del acta, a partir del usuario del directorio. */
export function cargoDePersona(persona) {
    return [persona?.cargo, persona?.dependencia_nombre || persona?.dependencia]
        .map((v) => String(v || '').trim())
        .filter(Boolean)
        .join(' / ');
}

// ── Estados del acta ──────────────────────────────────────────
// Revisar es opcional: quien redacta puede publicar directamente para firmas.
export const ESTADOS_ACTA = {
    BORRADOR: { label: 'Borrador', clase: 'bg-amber-50 text-amber-700 border-amber-200', punto: 'bg-amber-500' },
    EN_REVISION: { label: 'En revisión', clase: 'bg-indigo-50 text-indigo-700 border-indigo-200', punto: 'bg-indigo-500' },
    PARA_FIRMA: { label: 'Para firmas', clase: 'bg-sky-50 text-sky-700 border-sky-200', punto: 'bg-sky-500' },
    FIRMADA: { label: 'Firmada', clase: 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]', punto: 'bg-[#10B981]' },
};

/** Estado que se muestra: una publicada en la que ya firmaron todas las personas aparece como "Firmada". */
export function estadoVisible(acta) {
    const firmas = acta?.firmas || [];
    const estado = acta?.estado || (acta?.borrador ? 'BORRADOR' : 'PARA_FIRMA');
    if (estado === 'PARA_FIRMA' && firmas.length > 0 && firmas.every((f) => f.firmado)) return 'FIRMADA';
    return estado;
}

// Botones de cambio de estado según desde dónde y hacia dónde va el acta.
export function accionDeEstado(acta, destino, esCreador) {
    const desde = acta?.estado;
    if (destino === 'EN_REVISION') return { texto: 'Enviar a revisión', pideMotivo: false, tono: 'indigo' };
    if (destino === 'PARA_FIRMA') {
        return desde === 'EN_REVISION'
            ? { texto: 'Aprobar y publicar para firmas', pideMotivo: false, tono: 'emerald' }
            : { texto: 'Publicar para firmas', pideMotivo: false, tono: 'emerald' };
    }
    if (desde === 'PARA_FIRMA') {
        return { texto: 'Reabrir para corregir', pideMotivo: true, tono: 'rose',
            confirmar: 'Se anularán las firmas que ya se registraron y el acta volverá a borrador.' };
    }
    if (desde === 'EN_REVISION' && !esCreador) return { texto: 'Devolver con observaciones', pideMotivo: true, tono: 'amber' };
    return { texto: 'Retirar de revisión', pideMotivo: false, tono: 'slate' };
}


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

const normalizarNombre = (nombre) => String(nombre || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/\s+/).filter(Boolean).join(' ');

const nombreValido = (nombre) => !!nombre && nombre.trim() !== '' && nombre.trim().toUpperCase() !== 'N/A';

/**
 * Toda persona en asistentes o invitados aparece en firmas, aunque se haya agregado después.
 * Misma regla que aplica el servidor: por usuario y, si no hay usuario, por nombre.
 */
export function sincronizarFirmasConParticipantes(acta) {
    const firmas = (acta?.firmas || []).map((f) => ({ ...f }));
    const porId = new Map(firmas.filter((f) => f.user_id != null).map((f) => [String(f.user_id), f]));
    const porNombre = new Map(firmas.map((f) => [normalizarNombre(f.nombre), f]));
    [...(acta?.asistentes || []), ...(acta?.invitados || [])].forEach((p) => {
        if (!nombreValido(p?.nombre)) return;
        const uid = p.user_id != null && p.user_id !== '' ? String(p.user_id) : null;
        let existente = uid ? porId.get(uid) : null;
        if (!existente) {
            const mismoNombre = porNombre.get(normalizarNombre(p.nombre));
            if (mismoNombre && (!uid || mismoNombre.user_id == null || String(mismoNombre.user_id) === uid)) {
                existente = mismoNombre;
                if (uid) { existente.user_id = p.user_id; porId.set(uid, existente); }
            }
        }
        if (!existente) {
            const nueva = { nombre: p.nombre.trim(), firma: '', user_id: p.user_id ?? null, firmado: false, fecha: '' };
            firmas.push(nueva);
            porNombre.set(normalizarNombre(nueva.nombre), nueva);
            if (uid) porId.set(uid, nueva);
        }
    });
    return firmas;
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
        cargo: cargoDePersona(s),
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

export function miFirma(acta, userId) {
    return (acta?.firmas || []).find((f) => f.user_id != null && String(f.user_id) === String(userId));
}

export function filtrarMisActas(misActas = [], userId, misFilter = 'todas', misYear = '', misSearch = '') {
    let list = [...misActas];
    if (misFilter === 'pendientes') {
        list = list.filter((a) => a.permisos?.firmar);
    } else if (misFilter === 'firmadas') {
        list = list.filter((a) => miFirma(a, userId)?.firmado === true);
    } else if (misFilter === 'revision') {
        list = list.filter((a) => a.estado === 'EN_REVISION' && a.permisos?.revisar);
    } else if (misFilter === 'borradores') {
        list = list.filter((a) => a.estado === 'BORRADOR');
    }
    if (misYear) list = list.filter((a) => (a.fecha || '').includes(misYear));
    if (misSearch.trim()) {
        const q = misSearch.toLowerCase();
        list = list.filter((a) =>
            [a.numero, a.lugar, a.instancias, a.orden_dia, a.creador_nombre].some((v) => (v || '').toLowerCase().includes(q))
        );
    }
    return list;
}

/** Actas publicadas en las que a la persona todavía le falta firmar. */
export function calcularPendientesPorFirmar(actas = []) {
    return actas.filter((a) => a.permisos?.firmar).length;
}

export function calcularPorRevisar(actas = []) {
    return actas.filter((a) => a.estado === 'EN_REVISION' && a.permisos?.revisar).length;
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
