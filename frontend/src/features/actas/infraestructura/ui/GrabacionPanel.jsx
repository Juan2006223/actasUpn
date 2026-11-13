import React, { useCallback, useRef, useState } from 'react';
import {
    AudioLines, Upload, FileText, Loader2, CheckCircle2, AlertTriangle, X, Sparkles, RotateCcw,
    ChevronUp, ChevronDown, Plus, Trash2, Clock,
} from 'lucide-react';
import { useGrabacion } from '../../aplicacion/useGrabacion';
import * as grabacionesApi from '../api/grabacionesApi';
import {
    ETAPAS, TEXTO_ESTADO, enProceso, indiceEtapa, formatoTamano, ordenarArchivos, moverElemento, mensajeCola,
} from '../../dominio/grabacionModel';
import GrabacionResultado from './GrabacionResultado';

const btn = 'inline-flex items-center gap-2 font-semibold px-4 py-2 rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const iconBtn = 'p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer disabled:opacity-30 disabled:cursor-default';

function Barra({ valor }) {
    return (
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-ilinyx-600 transition-all duration-500" style={{ width: `${Math.max(2, Math.min(100, valor))}%` }} />
        </div>
    );
}

function Etapas({ estado, esTexto }) {
    const actual = indiceEtapa(estado);
    const etapas = esTexto ? ETAPAS.filter((e) => e.clave === 'REDACTANDO') : ETAPAS;
    return (
        <ol className="flex flex-wrap gap-2 text-xs">
            {etapas.map((e) => {
                const i = ETAPAS.indexOf(e);
                const clase = i < actual
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : i === actual && estado !== 'EN_COLA' ? 'bg-ilinyx-50 text-ilinyx-700 border-ilinyx-100' : 'bg-slate-50 text-slate-400 border-slate-200';
                return <li key={e.clave} className={`px-2.5 py-1 rounded-full border font-semibold ${clase}`}>{i < actual ? '✓ ' : ''}{e.titulo}</li>;
            })}
        </ol>
    );
}

/** Lista ordenable de archivos elegidos, antes de subirlos. */
function ArchivosElegidos({ archivos, setArchivos, onAgregar }) {
    return (
        <div className="space-y-2">
            {archivos.length > 1 && (
                <p className="text-xs text-slate-500">Se unirán en este orden como una sola reunión. Revisa que la parte 1 sea el inicio de la reunión.</p>
            )}
            <ol className="space-y-1.5">
                {archivos.map((a, i) => (
                    <li key={`${a.name}-${a.size}-${i}`} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm">
                        <span className="text-xs font-bold text-ilinyx-700 w-14 shrink-0">Parte {i + 1}</span>
                        <span className="truncate flex-1 text-slate-700">{a.name}</span>
                        <span className="text-xs text-slate-400 shrink-0">{formatoTamano(a.size)}</span>
                        <button type="button" className={iconBtn} disabled={i === 0} onClick={() => setArchivos(moverElemento(archivos, i, -1))} aria-label="Subir"><ChevronUp className="h-4 w-4" /></button>
                        <button type="button" className={iconBtn} disabled={i === archivos.length - 1} onClick={() => setArchivos(moverElemento(archivos, i, 1))} aria-label="Bajar"><ChevronDown className="h-4 w-4" /></button>
                        <button type="button" className={iconBtn} onClick={() => setArchivos(archivos.filter((_, k) => k !== i))} aria-label="Quitar"><Trash2 className="h-4 w-4" /></button>
                    </li>
                ))}
            </ol>
            <button type="button" onClick={onAgregar} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ilinyx-600 hover:text-ilinyx-800 cursor-pointer">
                <Plus className="h-3.5 w-3.5" /> Agregar otra parte
            </button>
        </div>
    );
}

export default function GrabacionPanel({ acta, onChange }) {
    const vincular = useCallback((id) => onChange((p) => ({ ...p, grabacion_id: id })), [onChange]);
    const { config, grabacion, subida, error, subirArchivos, procesarTextos, redactarDeNuevo, descartar } =
        useGrabacion({ grabacionId: acta.grabacion_id, onVincular: vincular, servicio: grabacionesApi });

    const inputArchivo = useRef(null);
    const [archivos, setArchivos] = useState([]);
    const [modoTexto, setModoTexto] = useState(false);
    const [textos, setTextos] = useState(['']);
    const [numHablantes, setNumHablantes] = useState('');
    const [verResultado, setVerResultado] = useState(false);

    const estado = grabacion?.estado;
    const subidaIncompleta = estado === 'SUBIENDO' && !subida;
    const maxPartes = config?.max_partes || 20;

    const elegirArchivos = (e) => {
        const nuevos = ordenarArchivos(Array.from(e.target.files || []));
        e.target.value = '';
        if (!nuevos.length) return;
        // Al continuar una subida cortada se eligen de nuevo todos los archivos: se respeta el orden original.
        if (subidaIncompleta) {
            const orden = grabacion.partes.map((p) => nuevos.find((a) => a.name === p.nombre && a.size === p.tamano)).filter(Boolean);
            subirArchivos(orden.length === grabacion.partes.length ? orden : nuevos, acta, numHablantes ? Number(numHablantes) : null);
            return;
        }
        setArchivos((prev) => [...prev, ...nuevos].slice(0, maxPartes));
    };

    const iniciarSubida = async () => {
        const elegidos = archivos;
        setArchivos([]);
        await subirArchivos(elegidos, acta, numHablantes ? Number(numHablantes) : null);
    };

    const enviarTextos = async () => {
        await procesarTextos(textos.map((t) => t.trim()).filter(Boolean), acta);
        setTextos(['']);
        setModoTexto(false);
    };

    const quitar = () => {
        if (enProceso(estado) && !window.confirm('Se detendrá el procesamiento y se borrará la grabación. ¿Continuar?')) return;
        descartar();
    };

    const aceptar = (config?.extensiones || []).map((x) => `.${x}`).join(',') || 'audio/*,video/*';
    const textosListos = textos.some((t) => t.trim());

    return (
        <div className="rounded-2xl border border-ilinyx-100 bg-gradient-to-br from-ilinyx-50/70 to-white p-5 space-y-4">
            <input ref={inputArchivo} type="file" accept={aceptar} multiple className="hidden" onChange={elegirArchivos} />

            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-ilinyx-700 text-white flex items-center justify-center shrink-0"><AudioLines className="h-5 w-5" /></div>
                    <div>
                        <h3 className="font-bold text-slate-800">Generar desde la grabación</h3>
                        <p className="text-xs text-slate-500 max-w-xl">
                            Sube el audio o video de la reunión (en uno o varios archivos): el sistema lo transcribe, identifica quién habla
                            y propone el orden del día, el desarrollo y los compromisos. Después solo corriges.
                        </p>
                        <p className="text-xs text-slate-500 max-w-xl mt-1">
                            {(acta.orden_dia || '').trim()
                                ? 'Se usará el orden del día que ya escribiste en el formulario.'
                                : 'Consejo: si escribes antes el orden del día, la IA lo respeta y el acta sale mejor organizada.'}
                        </p>
                    </div>
                </div>
                {grabacion && !subida && (
                    <button type="button" onClick={quitar} className="text-xs font-semibold text-slate-400 hover:text-red-500 cursor-pointer inline-flex items-center gap-1">
                        <X className="h-3.5 w-3.5" /> {enProceso(estado) ? 'Cancelar y quitar' : 'Quitar grabación'}
                    </button>
                )}
            </div>

            {error && (
                <p className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> {error}
                </p>
            )}

            {/* 1. Sin grabación: elegir archivos o pegar transcripciones */}
            {!grabacion && !subida && (
                <div className="space-y-3">
                    {archivos.length > 0 ? (
                        <>
                            <ArchivosElegidos archivos={archivos} setArchivos={setArchivos} onAgregar={() => inputArchivo.current?.click()} />
                            <div className="flex flex-wrap items-center gap-2">
                                <button type="button" onClick={iniciarSubida} className={`${btn} bg-ilinyx-700 hover:bg-ilinyx-800 text-white shadow`}>
                                    <Upload className="h-4 w-4" /> {archivos.length > 1 ? `Subir y procesar ${archivos.length} partes` : 'Subir y procesar'}
                                </button>
                                <button type="button" onClick={() => setArchivos([])} className={`${btn} text-slate-500 hover:bg-slate-100`}>Cancelar</button>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => inputArchivo.current?.click()} className={`${btn} bg-ilinyx-700 hover:bg-ilinyx-800 text-white shadow`}>
                                <Upload className="h-4 w-4" /> Subir grabación
                            </button>
                            <button type="button" onClick={() => setModoTexto((v) => !v)} className={`${btn} bg-white border border-slate-200 hover:bg-slate-50 text-slate-700`}>
                                <FileText className="h-4 w-4" /> Ya tengo la transcripción
                            </button>
                        </div>
                    )}

                    {!modoTexto && (
                        <>
                            <label className="flex items-center gap-2 text-xs text-slate-500">
                                ¿Cuántas personas hablaron?
                                <input type="number" min="1" max="50" value={numHablantes} onChange={(e) => setNumHablantes(e.target.value)} placeholder="Opcional"
                                    className="w-24 px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-sm" />
                            </label>
                            <p className="text-xs text-slate-400">
                                Audio o video de hasta {formatoTamano((config?.max_mb || 2048) * 1024 * 1024)} en total. Si la reunión quedó en varios archivos,
                                selecciónalos todos: se unen en orden y cada voz conserva su etiqueta en todas las partes.
                                Si se corta la conexión, la subida continúa donde quedó. Conviene llenar antes fecha, horas y asistentes: la IA los usa.
                            </p>
                        </>
                    )}

                    {modoTexto && archivos.length === 0 && (
                        <div className="space-y-3">
                            <p className="text-xs text-slate-500">
                                Si la reunión se transcribió en varias partes, pega cada una por separado y en orden.
                                Etiquetas como "Orador 1" se tratan por separado en cada parte (pueden ser personas distintas);
                                los nombres reales sí se reconocen en todas.
                            </p>
                            {textos.map((t, i) => (
                                <div key={i} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-ilinyx-700">{textos.length > 1 ? `Parte ${i + 1}` : 'Transcripción'}</span>
                                        {textos.length > 1 && (
                                            <button type="button" onClick={() => setTextos(textos.filter((_, k) => k !== i))} className="text-xs text-slate-400 hover:text-red-500 cursor-pointer">Quitar</button>
                                        )}
                                    </div>
                                    <textarea rows={5} value={t} onChange={(e) => setTextos(textos.map((x, k) => (k === i ? e.target.value : x)))}
                                        placeholder="Pega aquí la transcripción (por ejemplo, la de Teams, Meet o Zoom)…"
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ilinyx-400/20" />
                                </div>
                            ))}
                            <div className="flex flex-wrap items-center gap-2">
                                <button type="button" disabled={!textosListos} onClick={enviarTextos} className={`${btn} bg-ilinyx-700 hover:bg-ilinyx-800 text-white`}>
                                    <Sparkles className="h-4 w-4" /> Generar propuesta
                                </button>
                                {textos.length < maxPartes && (
                                    <button type="button" onClick={() => setTextos([...textos, ''])} className={`${btn} text-ilinyx-700 hover:bg-ilinyx-50`}>
                                        <Plus className="h-4 w-4" /> Agregar otra parte
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 2. Subiendo */}
            {subida && (
                <div className="space-y-2">
                    <div className="flex justify-between text-sm gap-3">
                        <span className="font-semibold text-slate-700 flex items-center gap-2 min-w-0">
                            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                            <span className="truncate">Subiendo {subida.partes > 1 ? `parte ${subida.parte + 1} de ${subida.partes}` : grabacion?.nombre_archivo}</span>
                        </span>
                        <span className="text-slate-500 shrink-0">{formatoTamano(subida.enviados)} de {formatoTamano(subida.total)}</span>
                    </div>
                    <Barra valor={(subida.enviados / subida.total) * 100} />
                    <p className="text-xs text-slate-400">No cierres esta ventana hasta que termine la subida. Después puedes cerrarla: el proceso sigue en el servidor.</p>
                    <button type="button" onClick={descartar} className="text-xs font-semibold text-slate-500 hover:text-red-500 cursor-pointer">Cancelar</button>
                </div>
            )}

            {/* 2b. Subida que quedó a medias (se cerró la ventana) */}
            {subidaIncompleta && (
                <div className="space-y-2">
                    <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                        La subida de <strong>{grabacion.nombre_archivo}</strong> quedó incompleta
                        ({Math.round((grabacion.recibido_bytes / Math.max(1, grabacion.tamano_bytes)) * 100)}%).
                        Selecciona {grabacion.partes?.length > 1 ? `los mismos ${grabacion.partes.length} archivos` : 'el mismo archivo'} para continuar donde quedó.
                    </p>
                    <button type="button" onClick={() => inputArchivo.current?.click()} className={`${btn} bg-ilinyx-700 hover:bg-ilinyx-800 text-white`}>
                        <Upload className="h-4 w-4" /> Continuar subida
                    </button>
                </div>
            )}

            {/* 3. Procesando en el servidor */}
            {grabacion && enProceso(estado) && (
                <div className="space-y-3">
                    <Etapas estado={estado} esTexto={grabacion.es_texto} />
                    {estado === 'EN_COLA' ? (
                        <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <Clock className="h-4 w-4 text-amber-500" /> En espera · {mensajeCola(grabacion.posicion_en_cola)}
                        </p>
                    ) : (
                        <>
                            <div className="flex justify-between text-sm">
                                <span className="font-semibold text-slate-700 flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" /> {grabacion.mensaje || TEXTO_ESTADO[estado]}
                                </span>
                                <span className="text-slate-500">{grabacion.progreso}%</span>
                            </div>
                            <Barra valor={grabacion.progreso} />
                        </>
                    )}
                    <p className="text-xs text-slate-400">
                        {grabacion.es_texto
                            ? 'Una transcripción larga puede tardar entre 15 y 60 minutos en redactarse con la IA local.'
                            : 'Una reunión de 2 horas puede tardar entre 1 y 2 horas en este servidor.'}
                        {' '}Puedes seguir llenando el acta o cerrar la ventana: el avance se guarda y al volver verás el resultado.
                    </p>
                </div>
            )}

            {/* 4. Listo */}
            {estado === 'LISTO' && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-emerald-100 rounded-xl px-4 py-3">
                    <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" /> Propuesta lista
                        <span className="font-normal text-slate-500">· {grabacion.propuesta?.orden_dia?.length || 0} puntos, {grabacion.propuesta?.compromisos?.length || 0} compromisos</span>
                    </p>
                    <button type="button" onClick={() => setVerResultado(true)} className={`${btn} bg-emerald-600 hover:bg-emerald-700 text-white shadow`}>
                        <Sparkles className="h-4 w-4" /> Revisar y aplicar al acta
                    </button>
                </div>
            )}

            {/* 5. Error */}
            {estado === 'ERROR' && (
                <div className="space-y-2">
                    <p className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> {grabacion.mensaje}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {grabacion.tiene_transcripcion ? (
                            <>
                                <button type="button" onClick={() => redactarDeNuevo(grabacion.nombres_hablantes || {}, acta)} className={`${btn} bg-ilinyx-700 hover:bg-ilinyx-800 text-white`}>
                                    <RotateCcw className="h-4 w-4" /> Reintentar redacción
                                </button>
                                <button type="button" onClick={() => setVerResultado(true)} className={`${btn} bg-white border border-slate-200 text-slate-700`}>
                                    <FileText className="h-4 w-4" /> Ver transcripción
                                </button>
                            </>
                        ) : (
                            <button type="button" onClick={descartar} className={`${btn} bg-white border border-slate-200 text-slate-700`}>Intentar con otro archivo</button>
                        )}
                    </div>
                </div>
            )}

            {verResultado && grabacion && (
                <GrabacionResultado
                    grabacion={grabacion}
                    acta={acta}
                    onAplicar={(siguiente) => { onChange(() => siguiente); setVerResultado(false); }}
                    onRedactar={(nombres) => { redactarDeNuevo(nombres, acta); setVerResultado(false); }}
                    onClose={() => setVerResultado(false)}
                />
            )}
        </div>
    );
}
