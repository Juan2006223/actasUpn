import React from 'react';
import { History, X } from 'lucide-react';
import { describirBorrador } from '../../dominio/actaModel';

const formatoFecha = (iso) => {
    try {
        return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
        return iso;
    }
};

export default function BorradoresPendientes({ borradores, onContinuar, onDescartar }) {
    if (!borradores?.length) return null;
    return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-800">
                <History className="h-4 w-4" />
                <p className="text-sm font-bold">
                    {borradores.length === 1 ? 'Tienes un acta con cambios sin guardar' : `Tienes ${borradores.length} actas con cambios sin guardar`}
                </p>
            </div>
            <ul className="space-y-2">
                {borradores.map((b) => (
                    <li key={b.clave} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/70 border border-amber-100 px-3 py-2">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{describirBorrador(b.acta)}</p>
                            <p className="text-xs text-slate-500">Último cambio: {formatoFecha(b.guardadoEn)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => onContinuar(b)} className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg cursor-pointer">
                                Continuar
                            </button>
                            <button type="button" onClick={() => onDescartar(b)} title="Descartar estos cambios" className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-100 cursor-pointer">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export { formatoFecha };
