import React, { useState } from 'react';
import { formatoFecha } from './BorradoresPendientes';

const ETIQUETAS = {
    devolucion: { texto: 'Devuelta', clase: 'bg-amber-100 text-amber-800' },
    sistema: { texto: 'Aviso', clase: 'bg-slate-200 text-slate-700' },
};

/** Observaciones del acta: las ven quien redacta, el revisor y todas las personas que participan. */
export default function ObservacionesActa({ observaciones = [], puedeComentar, onEnviar, compacto = false }) {
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);
    const lista = [...(observaciones || [])].reverse(); // la más reciente primero

    const enviar = async (e) => {
        e.preventDefault();
        if (!texto.trim()) return;
        setEnviando(true);
        const ok = await onEnviar(texto.trim());
        setEnviando(false);
        if (ok) setTexto('');
    };

    return (
        <section className="space-y-2" aria-label="Observaciones">
            <div className="flex items-center gap-1.5">
                <h5 className="text-xs font-black text-slate-900">Observaciones</h5>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black">{lista.length}</span>
            </div>

            {lista.length === 0 ? (
                !compacto && <p className="text-[11px] font-medium text-slate-400">Nadie ha dejado observaciones.</p>
            ) : (
                <ul className={`space-y-2 ${compacto ? '' : 'max-h-64 overflow-y-auto pr-1'}`}>
                    {lista.map((o, i) => {
                        const etiqueta = ETIQUETAS[o.tipo];
                        return (
                            <li key={o.id || `${o.fecha}-${i}`} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                    <span className="text-[11px] font-black text-slate-800">{o.autor || 'Participante'}</span>
                                    {etiqueta && <span className={`text-[9px] font-black px-1.5 rounded ${etiqueta.clase}`}>{etiqueta.texto}</span>}
                                    {o.fecha && <span className="text-[10px] font-semibold text-slate-400">{formatoFecha(o.fecha)}</span>}
                                </div>
                                <p className="text-xs text-slate-700 whitespace-pre-wrap break-words mt-0.5">{o.texto}</p>
                            </li>
                        );
                    })}
                </ul>
            )}

            {puedeComentar && (
                <form onSubmit={enviar} className="flex gap-2 pt-1">
                    <label htmlFor="nueva-observacion" className="sr-only">Nueva observación</label>
                    <input id="nueva-observacion" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={2000}
                        placeholder="Agregar observación al acta..."
                        className="flex-1 min-w-0 px-3 py-2 text-xs rounded-2xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
                    <button type="submit" disabled={enviando || !texto.trim()}
                        className="px-3.5 py-2 text-xs font-black bg-slate-900 text-white rounded-2xl hover:bg-slate-800 disabled:opacity-40 cursor-pointer">
                        {enviando ? 'Enviando...' : 'Enviar'}
                    </button>
                </form>
            )}
        </section>
    );
}
