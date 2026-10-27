import React from 'react';
import KpiStatCard from '../../../../shared/components/ui/KpiStatCard';
import {
    IconRoom,
    IconDashboard,
    IconCheckCircle,
    IconUsers,
    IconSettings,
    IconPencil,
} from '../../../../shared/components/ui/IconosMemorian';

export default function ActasHeader({
    isStudent,
    onNewActa,
    view,
    setView,
    allActasCount = 0,
    myActasCount = 0,
    firmadasCount = 0,
    participantesCount = 0,
    pendingCount = 0,
    firmaPersonal,
    onOpenGestionFirma,
}) {
    return (
        <div className="space-y-5">
            <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E7F8F2] text-[#008A63]">
                        <IconRoom className="h-6 w-6" />
                    </span>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-[#0F172A]">Gestión de actas</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Actas activas asignadas al formato oficial FOR023GDC, disponibles para firma y consulta.
                        </p>
                    </div>
                </div>

                <nav aria-label="Acciones de actas" className="inline-flex shrink-0 overflow-hidden rounded-2xl border border-[#D9E3F1] bg-white shadow-sm">
                    <button
                        type="button"
                        onClick={onOpenGestionFirma}
                        className="flex items-center gap-2 border-r border-[#D9E3F1] px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                    >
                        <IconPencil className={`h-3.5 w-3.5 ${firmaPersonal ? 'text-emerald-600' : 'text-amber-500'}`} />
                        {firmaPersonal ? 'Mi firma ✓' : 'Configurar firma'}
                    </button>
                    {!isStudent && (
                        <button
                            type="button"
                            onClick={onNewActa}
                            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                        >
                            <IconDashboard className="h-4 w-4 text-blue-600" />
                            Nueva acta
                        </button>
                    )}
                </nav>
            </header>

            <div className="flex flex-wrap items-center gap-2" aria-label="Categoría de actas">
                {!isStudent && (
                    <button
                        type="button"
                        onClick={() => setView('list')}
                        className={`rounded-full border px-4 py-2 text-xs font-bold cursor-pointer ${
                            view === 'list'
                                ? 'border-slate-200 bg-white text-slate-900 shadow-sm'
                                : 'border-transparent text-slate-500'
                        }`}
                    >
                        Todas las actas <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5">{allActasCount}</span>
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => setView('mis')}
                    className={`rounded-full border px-4 py-2 text-xs font-bold cursor-pointer ${
                        view === 'mis'
                            ? 'border-slate-200 bg-white text-slate-900 shadow-sm'
                            : 'border-transparent text-slate-500'
                    }`}
                >
                    Mis actas <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5">{myActasCount}</span>
                </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiStatCard value={allActasCount} label="Actas registradas" tone="amber" icon={IconRoom} />
                <KpiStatCard value={firmadasCount} label="Activas / firmadas" tone="emerald" icon={IconCheckCircle} />
                <KpiStatCard value={participantesCount} label="Participantes totales" tone="blue" icon={IconUsers} />
                <KpiStatCard value={pendingCount} label="Pendientes por firmar" tone="amber" icon={IconSettings} />
            </div>
        </div>
    );
}
