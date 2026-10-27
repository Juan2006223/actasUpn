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
    tipo: 'ACTA',
    numero: '',
    total: '',
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
