import React, { useState } from 'react';
import {
    IconRoom,
    IconLayers,
    IconLocationPin,
    IconUsers,
    IconPencil,
    IconTrash,
    IconEye,
} from '../../../../shared/components/ui/IconosMemorian';

export default function ActaCard({ acta, userId, onEdit, onDelete, onView, onSign, onComment }) {
    const [commentText, setCommentText] = useState('');

    if (!acta) {
        return (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 text-center text-slate-400 text-xs font-semibold">
                Selecciona un acta de la lista para ver su detalle completo.
            </div>
        );
    }

    const firmas = acta.firmas || [];
    const totalFirmas = firmas.length;
    const firmasHechas = firmas.filter((f) => f.firmado).length;
    const miEntry = firmas.find((f) => f.user_id && String(f.user_id) === String(userId));
    const yoFirme = miEntry?.firmado;
    const completa = totalFirmas > 0 && firmasHechas === totalFirmas;

    const submitComment = () => {
        if (!commentText.trim()) return;
        onComment?.(acta.id, commentText);
        setCommentText('');
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900">Detalle del acta</h3>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                    completa ? 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]' : 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]'
                }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${completa ? 'bg-[#10B981]' : 'bg-[#F59E0B]'}`} />
                    {completa ? 'Firmada' : 'Activa'}
                </span>
            </div>

            <div className="flex items-start gap-4">
                <div style={{ backgroundColor: '#EC4899' }} className="w-12 h-12 rounded-2xl text-white flex items-center justify-center shrink-0 shadow-md">
                    <IconRoom className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                    <h4 className="text-base font-black text-slate-900 truncate">
                        {acta.numero ? `Acta No. ${acta.numero}` : `Acta #${acta.id}`}
                    </h4>
                    <p className="text-xs font-bold text-slate-400">
                        {acta.tipo || 'ACTA'} · Código FOR023GDC · {acta.instancias || 'UPN'}
                    </p>
                </div>
            </div>

            <div className="space-y-2">
                <h5 className="text-xs font-black text-slate-900">Información</h5>
                <div className="bg-[#F8FAFC] border border-slate-100 rounded-2xl p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600 font-medium">
                        <span className="flex items-center gap-1.5 text-slate-400"><IconLayers className="w-3.5 h-3.5" /> Instancia / Grupo:</span>
                        <span className="font-extrabold text-slate-900">{acta.instancias || 'No especificada'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 font-medium">
                        <span className="flex items-center gap-1.5 text-slate-400"><IconLocationPin className="w-3.5 h-3.5" /> Lugar y Fecha:</span>
                        <span className="font-extrabold text-slate-900">{[acta.lugar, acta.fecha].filter(Boolean).join(' · ') || 'No especificado'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 font-medium">
                        <span className="flex items-center gap-1.5 text-slate-400"><IconUsers className="w-3.5 h-3.5" /> Firmas registradas:</span>
                        <span className="font-extrabold text-slate-900">{firmasHechas} de {totalFirmas} personas</span>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                    <h5 className="text-xs font-black text-slate-900">Participantes y firmas</h5>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black">{totalFirmas}</span>
                </div>
                {totalFirmas > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                        {firmas.map((f, i) => (
                            <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold">
                                <span>{f.nombre}</span>
                                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${f.firmado ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'}`}>
                                    {f.firmado ? '✓' : 'Pend.'}
                                </span>
                            </span>
                        ))}
                    </div>
                ) : (
                    <div className="p-3 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-xs font-medium">
                        Sin firmantes asociados a esta acta.
                    </div>
                )}
            </div>

            {miEntry && !yoFirme && (
                <button
                    type="button"
                    onClick={() => onSign(acta.id)}
                    className="w-full py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-md transition cursor-pointer"
                >
                    Firmar acta ahora
                </button>
            )}

            {onComment && (
                <div className="flex gap-2 pt-1">
                    <input
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && submitComment()}
                        placeholder="Agregar observación al acta..."
                        className="flex-1 px-3 py-2 text-xs rounded-2xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none"
                    />
                    <button type="button" onClick={submitComment} className="px-3.5 py-2 text-xs font-black bg-slate-900 text-white rounded-2xl hover:bg-slate-800 cursor-pointer">
                        Enviar
                    </button>
                </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => onView(acta)}
                    className="flex-1 py-2.5 rounded-2xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-black shadow-md cursor-pointer transition flex items-center justify-center gap-2"
                >
                    <IconEye className="w-4 h-4 text-emerald-400" /> Ver / PDF Oficial
                </button>
                {onEdit && (
                    <button
                        type="button"
                        onClick={() => onEdit(acta)}
                        className="px-3.5 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer flex items-center gap-1.5 transition"
                    >
                        <IconPencil className="w-3.5 h-3.5" /> Editar
                    </button>
                )}
                {onDelete && (
                    <button
                        type="button"
                        onClick={() => onDelete(acta.id)}
                        className="px-3 py-2.5 rounded-2xl bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-600 hover:text-white cursor-pointer flex items-center gap-1 transition"
                    >
                        <IconTrash className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
}
