import React, { useState } from 'react';
import { IconCheckCircle } from '../../../../shared/components/ui/IconosMemorian';

export default function InvitacionesTabla({ invitaciones = [] }) {
    const [copiadoId, setCopiadoId] = useState(null);

    if (invitaciones.length === 0) {
        return (
            <div className="py-12 text-center bg-white rounded-3xl border border-slate-100 p-6 shadow-2xs">
                <p className="text-xs font-bold text-slate-500">
                    No hay invitaciones ni pre-registros pendientes de activación.
                </p>
            </div>
        );
    }

    const copiarMensaje = (inv) => {
        const texto = `Portal Institucional Memorian UPN:\n${window.location.origin}/login\n\nInstrucciones de Acceso:\nIngresa con tu correo (${inv.email || 'institucional'}) o cédula (${inv.document_number || inv.username}) para gestionar y firmar actas FOR023GDC.`;
        navigator.clipboard?.writeText(texto);
        setCopiadoId(inv.id);
        setTimeout(() => setCopiadoId(null), 2500);
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            <th className="py-3.5 px-4">Cédula Autorizada</th>
                            <th className="py-3.5 px-4">Correo Institucional</th>
                            <th className="py-3.5 px-4">Estado Invitación</th>
                            <th className="py-3.5 px-4 text-right">Enlace e Instrucciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                        {invitaciones.map((inv) => {
                            const fueCopiado = copiadoId === inv.id;
                            return (
                                <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                                    <td className="py-3.5 px-4 font-bold text-slate-800">
                                        CC {inv.document_number || inv.username}
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                                        {inv.email || 'Sin correo precargado'}
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-amber-50/80 text-amber-800 border border-amber-200/80">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                            PENDIENTE DE ACTIVACIÓN
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-right">
                                        <div className="flex items-center justify-end">
                                            <button
                                                type="button"
                                                onClick={() => copiarMensaje(inv)}
                                                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                                                    fueCopiado
                                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                                        : 'bg-blue-50/80 text-brand-blue hover:bg-brand-blue hover:text-white shadow-2xs'
                                                }`}
                                            >
                                                {fueCopiado ? (
                                                    <>
                                                        <IconCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                                        <span>Enlace e Instrucciones Copiados</span>
                                                    </>
                                                ) : (
                                                    <span>Copiar Enlace e Instrucciones</span>
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
