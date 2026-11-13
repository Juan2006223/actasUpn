import React, { useMemo, useState } from 'react';
import { X, Download, Sparkles, RotateCcw, AlertTriangle } from 'lucide-react';
import {
    hablantesDe, intervenciones, transcripcionComoTexto, formatoTiempo, totalPartes,
    aplicarPropuestaEnActa, camposQueSeReemplazan, personasNuevas,
} from '../../dominio/grabacionModel';

const COLORES = ['text-ilinyx-700', 'text-emerald-700', 'text-amber-700', 'text-pink-700', 'text-sky-700', 'text-violet-700', 'text-orange-700', 'text-teal-700'];
// Color estable por etiqueta (también para "Parte 2 · Orador 1").
const colorDe = (hablante) => COLORES[[...String(hablante || '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % COLORES.length];

function Seccion({ titulo, children }) {
    return (
        <section className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">{titulo}</h4>
            {children}
        </section>
    );
}

function Propuesta({ propuesta }) {
    return (
        <div className="space-y-5">
            {(propuesta.avisos || []).length > 0 && (
                <div role="note" className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1">
                    {propuesta.avisos.map((a, i) => (
                        <p key={i} className="flex items-start gap-2 text-xs text-amber-800">
                            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {a}
                        </p>
                    ))}
                </div>
            )}
            <Seccion titulo="5. Orden del día">
                <ol className="list-decimal pl-5 text-sm text-slate-700 space-y-1">
                    {(propuesta.orden_dia || []).map((p, i) => <li key={i}>{p}</li>)}
                </ol>
            </Seccion>
            <Seccion titulo="6. Desarrollo del orden del día">
                <div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-xl p-4 max-h-80 overflow-y-auto border border-slate-100">{propuesta.desarrollo}</div>
            </Seccion>
            <Seccion titulo="7. Compromisos">
                {(propuesta.compromisos || []).length === 0 ? <p className="text-sm text-slate-400">No se identificaron compromisos.</p> : (
                    <table className="w-full text-sm border border-slate-100 rounded-xl overflow-hidden">
                        <thead className="bg-slate-50 text-xs text-slate-500 text-left"><tr><th className="p-2">Compromiso</th><th className="p-2">Responsable</th><th className="p-2">Fecha</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {propuesta.compromisos.map((c, i) => (
                                <tr key={i}><td className="p-2">{c.compromiso}</td><td className="p-2">{c.responsable || '—'}</td><td className="p-2 whitespace-nowrap">{c.fecha || 'Por definir'}</td></tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Seccion>
            <Seccion titulo="8. Próxima convocatoria">
                <p className="text-sm text-slate-700">{propuesta.proxima_convocatoria || 'N/A'}</p>
            </Seccion>
        </div>
    );
}

function Transcripcion({ segmentos, nombres, setNombres, esTexto }) {
    const hablantes = useMemo(() => hablantesDe(segmentos), [segmentos]);
    const lista = useMemo(() => intervenciones(segmentos, nombres), [segmentos, nombres]);
    const varias = totalPartes(segmentos) > 1;
    return (
        <div className="space-y-4">
            {hablantes.length > 0 && (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2">
                    <p className="text-xs text-slate-500">
                        Si sabes quién es cada voz, escribe su nombre y vuelve a redactar: el acta saldrá con los nombres correctos.
                        {varias && esTexto && ' Las etiquetas genéricas de cada parte (p. ej. "Parte 2 · Orador 1") pueden ser personas distintas: si dos son la misma persona, escribe el mismo nombre en ambas.'}
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2">
                        {hablantes.map(({ hablante, ejemplo }) => (
                            <label key={hablante} className="text-xs">
                                <span className={`font-bold ${colorDe(hablante)}`}>{hablante}</span>
                                <span className="text-slate-400"> · “{ejemplo.slice(0, 60)}{ejemplo.length > 60 ? '…' : ''}”</span>
                                <input value={nombres[hablante] || ''} onChange={(e) => setNombres({ ...nombres, [hablante]: e.target.value })}
                                    placeholder="Nombre real (opcional)" className="mt-1 w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-sm" />
                            </label>
                        ))}
                    </div>
                </div>
            )}
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {lista.map((i, k) => (
                    <React.Fragment key={k}>
                        {varias && (k === 0 || lista[k - 1].parte !== i.parte) && (
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100 pb-1 pt-2">Parte {i.parte + 1}</p>
                        )}
                        <p className="text-sm text-slate-700 leading-relaxed">
                            {!esTexto && <span className="text-xs text-slate-400 mr-2 tabular-nums">{formatoTiempo(i.inicio)}</span>}
                            {i.nombre && <span className={`font-bold mr-1 ${colorDe(i.hablante)}`}>{i.nombre}:</span>}
                            {i.texto}
                        </p>
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

export default function GrabacionResultado({ grabacion, acta, onAplicar, onRedactar, onClose }) {
    const propuesta = grabacion.propuesta || {};
    const hayPropuesta = grabacion.estado === 'LISTO' && propuesta.orden_dia;
    const [pestana, setPestana] = useState(hayPropuesta ? 'propuesta' : 'transcripcion');
    const [nombres, setNombres] = useState(grabacion.nombres_hablantes || {});
    const nuevas = personasNuevas(acta, propuesta);
    // Desmarcado por defecto: la IA puede proponer nombres mal transcritos; la persona decide.
    const [agregarAsistentes, setAgregarAsistentes] = useState(false);
    const reemplaza = camposQueSeReemplazan(acta);
    const nombresCambiaron = JSON.stringify(nombres) !== JSON.stringify(grabacion.nombres_hablantes || {});

    const descargar = () => {
        const blob = new Blob([transcripcionComoTexto(grabacion.segmentos || [], nombres, !grabacion.es_texto)], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcripcion-${acta.fecha || 'reunion'}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const tab = (clave, texto) => (
        <button type="button" onClick={() => setPestana(clave)}
            className={`px-4 py-2 text-sm font-semibold rounded-xl cursor-pointer ${pestana === clave ? 'bg-ilinyx-700 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{texto}</button>
    );

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <div>
                        <h3 className="font-bold text-slate-800">Propuesta generada desde la grabación</h3>
                        <p className="text-xs text-slate-400">
                            {grabacion.nombre_archivo}{grabacion.duracion_segundos ? ` · ${formatoTiempo(grabacion.duracion_segundos)}` : ''}
                            {grabacion.proveedor_redaccion ? ` · redactada con ${grabacion.proveedor_redaccion}` : ''}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer" aria-label="Cerrar"><X className="h-5 w-5" /></button>
                </div>

                <div className="flex gap-2 px-5 pt-4">
                    {hayPropuesta && tab('propuesta', 'Propuesta')}
                    {tab('transcripcion', 'Transcripción')}
                </div>

                <div className="p-5 overflow-y-auto flex-1">
                    {pestana === 'propuesta' && hayPropuesta
                        ? <Propuesta propuesta={propuesta} />
                        : <Transcripcion segmentos={grabacion.segmentos || []} nombres={nombres} setNombres={setNombres} esTexto={grabacion.es_texto} />}
                </div>

                <div className="p-5 border-t border-slate-100 space-y-3">
                    {pestana === 'propuesta' && hayPropuesta && (
                        <>
                            {nuevas.length > 0 && (
                                <label className="flex items-center gap-2 text-sm text-slate-600">
                                    <input type="checkbox" checked={agregarAsistentes} onChange={(e) => setAgregarAsistentes(e.target.checked)} className="accent-ilinyx-600" />
                                    Agregar a asistentes a las personas mencionadas: {nuevas.map((p) => p.nombre).join(', ')}
                                </label>
                            )}
                            {reemplaza.length > 0 && (
                                <p className="flex items-center gap-2 text-xs text-amber-700"><AlertTriangle className="h-3.5 w-3.5" /> Se reemplazará lo que ya escribiste en: {reemplaza.join(', ')}.</p>
                            )}
                        </>
                    )}
                    <div className="flex flex-wrap justify-between gap-2">
                        <button type="button" onClick={descargar} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-800 cursor-pointer">
                            <Download className="h-4 w-4" /> Descargar transcripción
                        </button>
                        <div className="flex gap-2">
                            {(pestana === 'transcripcion' || !hayPropuesta) && grabacion.tiene_transcripcion && (
                                <button type="button" onClick={() => onRedactar(nombres)}
                                    className="inline-flex items-center gap-2 bg-ilinyx-700 hover:bg-ilinyx-800 text-white font-semibold px-4 py-2 rounded-xl text-sm cursor-pointer">
                                    <RotateCcw className="h-4 w-4" /> {nombresCambiaron ? 'Volver a redactar con estos nombres' : 'Volver a redactar'}
                                </button>
                            )}
                            {pestana === 'propuesta' && hayPropuesta && (
                                <button type="button" onClick={() => onAplicar(aplicarPropuestaEnActa(acta, propuesta, { agregarAsistentes }))}
                                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-xl text-sm shadow cursor-pointer">
                                    <Sparkles className="h-4 w-4" /> Aplicar al acta
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
