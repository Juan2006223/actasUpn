// Reglas puras del flujo "grabación → propuesta de acta" (sin React ni API).

export const ESTADOS_EN_PROCESO = ['EN_COLA', 'TRANSCRIBIENDO', 'IDENTIFICANDO_HABLANTES', 'REDACTANDO'];

export const ETAPAS = [
    { clave: 'TRANSCRIBIENDO', titulo: 'Transcribir' },
    { clave: 'IDENTIFICANDO_HABLANTES', titulo: 'Identificar hablantes' },
    { clave: 'REDACTANDO', titulo: 'Redactar acta' },
];

export const TEXTO_ESTADO = {
    SUBIENDO: 'Subiendo archivo',
    EN_COLA: 'En espera de turno',
    TRANSCRIBIENDO: 'Transcribiendo el audio',
    IDENTIFICANDO_HABLANTES: 'Identificando quién habla',
    REDACTANDO: 'Redactando la propuesta de acta',
    LISTO: 'Propuesta lista',
    ERROR: 'Ocurrió un problema',
};

export const enProceso = (estado) => ESTADOS_EN_PROCESO.includes(estado);

export function indiceEtapa(estado) {
    if (estado === 'LISTO') return ETAPAS.length;
    const i = ETAPAS.findIndex((e) => e.clave === estado);
    return i === -1 ? 0 : i;
}

export function formatoTamano(bytes) {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

export function formatoTiempo(segundos) {
    const s = Math.max(0, Math.floor(segundos || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = String(s % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Siguiente trozo a enviar, o null si ya se envió todo. */
export function siguienteParte(tamano, recibido, parteBytes) {
    if (recibido >= tamano) return null;
    return { inicio: recibido, fin: Math.min(tamano, recibido + parteBytes) };
}

export function extensionPermitida(nombre, extensiones = []) {
    const ext = (nombre || '').split('.').pop()?.toLowerCase();
    return !!ext && nombre.includes('.') && extensiones.includes(ext);
}

/** Datos del acta que ayudan a la IA (fecha, lugar, asistentes…). */
export function contextoDesdeActa(acta) {
    const personas = (filas) => (filas || [])
        .filter((p) => p?.nombre && p.nombre.trim() && p.nombre !== 'N/A')
        .map((p) => ({ nombre: p.nombre.trim(), cargo: (p.cargo || '').trim() }));
    return {
        tipo: acta?.tipo || 'ACTA',
        fecha: acta?.fecha || '',
        hora_inicio: acta?.hora_inicio || '',
        hora_final: acta?.hora_final || '',
        instancias: acta?.instancias || '',
        lugar: acta?.lugar || '',
        asistentes: personas(acta?.asistentes),
        ausentes: personas(acta?.ausentes),
        invitados: personas(acta?.invitados),
        // Si la persona ya escribió el orden del día, la IA lo respeta.
        orden_dia: (acta?.orden_dia || '').trim(),
    };
}

export function hablantesDe(segmentos = []) {
    const vistos = new Map();
    segmentos.forEach((s) => {
        if (s.hablante && !vistos.has(s.hablante)) vistos.set(s.hablante, s.texto);
    });
    return [...vistos.entries()].map(([hablante, ejemplo]) => ({ hablante, ejemplo }));
}

/** Une segmentos seguidos de la misma voz (dentro de la misma parte) para mostrarlos como intervenciones. */
export function intervenciones(segmentos = [], nombres = {}) {
    const lista = [];
    segmentos.forEach((s) => {
        const texto = (s.texto || '').trim();
        if (!texto) return;
        const hablante = s.hablante || null;
        const parte = s.parte || 0;
        const ultima = lista[lista.length - 1];
        if (ultima && ultima.hablante === hablante && ultima.parte === parte) {
            ultima.texto += ` ${texto}`;
        } else {
            lista.push({ hablante, parte, nombre: (hablante && nombres[hablante]?.trim()) || hablante, inicio: s.inicio, texto });
        }
    });
    return lista;
}

export const totalPartes = (segmentos = []) => new Set(segmentos.map((s) => s.parte || 0)).size;

export function transcripcionComoTexto(segmentos = [], nombres = {}, conTiempos = true) {
    const varias = totalPartes(segmentos) > 1;
    let parteActual = null;
    const bloques = [];
    intervenciones(segmentos, nombres).forEach((i) => {
        if (varias && i.parte !== parteActual) {
            parteActual = i.parte;
            bloques.push(`=== Parte ${i.parte + 1} ===`);
        }
        const tiempo = conTiempos ? `[${formatoTiempo(i.inicio)}] ` : '';
        bloques.push(`${tiempo}${i.nombre ? `${i.nombre}: ` : ''}${i.texto}`);
    });
    return bloques.join('\n\n');
}

/** Orden natural por nombre: "parte 2" antes que "parte 10". */
export function ordenarArchivos(archivos = []) {
    return [...archivos].sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true, sensitivity: 'base' }));
}

export function moverElemento(lista, indice, delta) {
    const destino = indice + delta;
    if (destino < 0 || destino >= lista.length) return lista;
    const copia = [...lista];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    return copia;
}

/**
 * Para continuar una subida cortada: los archivos elegidos deben ser los mismos (nombre y tamaño, en el mismo orden).
 * Devuelve desde qué byte seguir en cada parte, o null si no coinciden.
 */
export function planDeReanudacion(partesServidor = [], archivos = []) {
    if (!partesServidor.length || partesServidor.length !== archivos.length) return null;
    const coinciden = partesServidor.every((p, i) => p.nombre === archivos[i].name && p.tamano === archivos[i].size);
    return coinciden ? partesServidor.map((p) => p.recibido || 0) : null;
}

export function mensajeCola(posicion) {
    if (!posicion) return 'Empezará en un momento';
    return posicion === 1
        ? 'Hay 1 reunión procesándose antes que esta. Empezará cuando termine.'
        : `Hay ${posicion} reuniones antes que esta en la cola. Empezará cuando terminen.`;
}

const vacio = (v) => !v || !String(v).trim() || String(v).trim() === 'N/A';
const normalizarNombre = (n) => (n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Qué partes del acta ya tienen contenido y serían reemplazadas por la propuesta. */
export function camposQueSeReemplazan(acta) {
    const campos = [];
    if (!vacio(acta?.orden_dia)) campos.push('Orden del día');
    if (!vacio(acta?.desarrollo)) campos.push('Desarrollo');
    if ((acta?.compromisos || []).some((c) => !vacio(c.compromiso))) campos.push('Compromisos');
    return campos;
}

export function personasNuevas(acta, propuesta) {
    const existentes = new Set((acta?.asistentes || []).map((p) => normalizarNombre(p.nombre)).filter(Boolean));
    return (propuesta?.asistentes_mencionados || []).filter((p) => !existentes.has(normalizarNombre(p.nombre)));
}

/** Vuelca la propuesta de la IA en el acta, lista para que la persona la corrija. */
export function aplicarPropuestaEnActa(acta, propuesta, { agregarAsistentes = false } = {}) {
    if (!propuesta) return acta;
    const siguiente = { ...acta };
    if (propuesta.orden_dia?.length) {
        siguiente.orden_dia = propuesta.orden_dia.map((p, i) => `${i + 1}. ${p}`).join('\n');
    }
    if (propuesta.desarrollo) siguiente.desarrollo = propuesta.desarrollo;
    if (propuesta.compromisos?.length) {
        siguiente.compromisos = propuesta.compromisos.map((c) => ({
            compromiso: c.compromiso || '',
            responsable: c.responsable || '',
            responsable_id: null,
            fecha: c.fecha || '',
        }));
    }
    if (!vacio(propuesta.proxima_convocatoria) || vacio(acta.proxima_convocatoria)) {
        siguiente.proxima_convocatoria = propuesta.proxima_convocatoria || 'N/A';
    }
    if (agregarAsistentes) {
        const nuevas = personasNuevas(acta, propuesta).map((p) => ({
            nombre: p.nombre, cargo: p.cargo || '', email: '', user_id: null, foto: '',
        }));
        const actuales = (acta.asistentes || []).filter((p) => !vacio(p.nombre));
        if (nuevas.length) siguiente.asistentes = [...actuales, ...nuevas];
    }
    return siguiente;
}
