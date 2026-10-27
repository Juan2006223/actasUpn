import React from 'react';
import KpiStatCard from '../../../../shared/components/ui/KpiStatCard';
import {
    IconRoom,
    IconCheckCircle,
    IconUsers,
    IconSettings,
    IconLayers,
    IconLocationPin,
    IconTrash,
} from '../../../../shared/components/ui/IconosMemorian';

export function KpiStatsGruposRow({ grupos = [] }) {
    const totalGrupos = grupos.length;
    const activos = grupos.length;
    const totalIntegrantes = grupos.reduce((acc, g) => acc + (g.student_count || g.students?.length || 0), 0);
    const sinConvocados = grupos.filter((g) => !(g.features || '').trim()).length;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiStatCard value={totalGrupos} label="Grupos registrados" tone="amber" icon={IconRoom} />
            <KpiStatCard value={activos} label="Activos" tone="emerald" icon={IconCheckCircle} />
            <KpiStatCard value={totalIntegrantes} label="Capacidad / integrantes" tone="blue" icon={IconUsers} />
            <KpiStatCard value={sinConvocados} label="Sin convocados extra" tone="amber" icon={IconSettings} />
        </div>
    );
}

export default function DetalleGrupoInspector({ grupo, nombreAsesor, onDelete }) {
    if (!grupo) {
        return (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 text-center text-slate-400 text-xs font-semibold">
                Selecciona un grupo de la lista para ver su detalle completo.
            </div>
        );
    }

    const codigo = `GRP-${String(grupo.id || 1).padStart(2, '0')}`;
    const integrantes = Array.isArray(grupo.students) ? grupo.students : [];
    const totalPersonas = grupo.student_count || integrantes.length || 1;

    return (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900">Detalle del grupo</h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                    Activo
                </span>
            </div>

            <div className="flex items-start gap-4">
                <div style={{ backgroundColor: '#EC4899' }} className="w-12 h-12 rounded-2xl text-white flex items-center justify-center shrink-0 shadow-md">
                    <IconRoom className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                    <h4 className="text-base font-black text-slate-900 truncate">{grupo.name}</h4>
                    <p className="text-xs font-bold text-slate-400">Grupo {grupo.id} · Código {codigo}</p>
                </div>
            </div>

            <div className="space-y-2">
                <h5 className="text-xs font-black text-slate-900">Información</h5>
                <div className="bg-[#F8FAFC] border border-slate-100 rounded-2xl p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600 font-medium">
                        <span className="flex items-center gap-1.5 text-slate-400"><IconLayers className="w-3.5 h-3.5" /> Categoría:</span>
                        <span className="font-extrabold text-slate-900">Grupo de Acta FOR023GDC</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 font-medium">
                        <span className="flex items-center gap-1.5 text-slate-400"><IconRoom className="w-3.5 h-3.5" /> Creador:</span>
                        <span className="font-extrabold text-slate-900">{nombreAsesor || 'Sin asignar'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 font-medium">
                        <span className="flex items-center gap-1.5 text-slate-400"><IconLocationPin className="w-3.5 h-3.5" /> Fecha inicio:</span>
                        <span className="font-extrabold text-slate-900">{grupo.date || 'No especificada'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 font-medium">
                        <span className="flex items-center gap-1.5 text-slate-400"><IconUsers className="w-3.5 h-3.5" /> Integrantes:</span>
                        <span className="font-extrabold text-slate-900">{totalPersonas} personas</span>
                    </div>
                    {grupo.description && (
                        <div className="pt-1 border-t border-slate-100 text-slate-600">
                            <span className="block text-[10px] font-black uppercase text-slate-400 mb-0.5">Propósito</span>
                            <p className="font-semibold text-slate-700">{grupo.description}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                    <h5 className="text-xs font-black text-slate-900">Participantes del grupo</h5>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black">
                        {integrantes.length}
                    </span>
                </div>
                {integrantes.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                        {integrantes.map((u, idx) => (
                            <span key={u.id || idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold">
                                <span>{u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim()}</span>
                                <span className="px-1.5 py-0.2 rounded-md bg-slate-900 text-white text-[10px] font-black">{u.role}</span>
                            </span>
                        ))}
                    </div>
                ) : (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-xs font-medium">
                        Sin participantes adicionales registrados.
                    </div>
                )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                <button
                    type="button"
                    onClick={() => onDelete(grupo.id)}
                    className="px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white text-xs font-black transition cursor-pointer flex items-center gap-2"
                >
                    <IconTrash className="w-3.5 h-3.5" /> Eliminar grupo
                </button>
            </div>
        </div>
    );
}
