import React, { useState } from 'react';
import { IconMenu } from './ui/IconosMemorian';

const ROLE_LABELS = {
    ADMIN: 'SUPERADMINISTRADOR',
    SUPERVISOR: 'SUPERVISOR',
    COORDINADOR: 'COORDINADOR',
    TEACHER: 'DOCENTE',
    APOYO: 'PROFESIONAL APOYO',
    ASISTENTE: 'ASISTENTE',
    STUDENT: 'ESTUDIANTE',
};

const PERIODOS = [
    { id: '2026-2', codigo: '2026-2', nombre: 'Período Institucional 2026-2', estado: 'PLANIFICACION' },
    { id: '2026-1', codigo: '2026-1', nombre: 'Período Institucional 2026-1', estado: 'ACTIVO' },
];

export default function AppHeader({ seccionActivaNombre, onToggleSidebar, onCerrarSesion, usuario }) {
    const [periodoId, setPeriodoId] = useState('2026-2');
    const actual = PERIODOS.find((p) => p.id === periodoId) || PERIODOS[0];

    const nombreCompleto = `${usuario?.first_name || ''} ${usuario?.last_name || ''}`.trim()
        || usuario?.full_name
        || usuario?.username
        || 'Usuario';
    const inicial = nombreCompleto.charAt(0).toUpperCase();
    const rolLabel = ROLE_LABELS[usuario?.role] || usuario?.role || 'INSTITUCIONAL';

    return (
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-3.5 px-6 bg-white/80 backdrop-blur-md rounded-3xl border border-slate-100 shadow-2xs no-print">
            <div className="flex items-center gap-3">
                <button
                    onClick={onToggleSidebar}
                    className="w-9 h-9 rounded-2xl bg-white border border-slate-200/70 flex items-center justify-center text-slate-600 hover:text-brand-blue hover:border-brand-blue/40 shadow-2xs transition-all cursor-pointer active:scale-95"
                    aria-label="Expandir o contraer menú lateral"
                    title="Alternar barra lateral"
                >
                    <IconMenu className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                    <span className="text-slate-700">Memorian</span>
                    <span>&gt;</span>
                    <span>Gestión Institucional</span>
                    <span>&gt;</span>
                    <span className="text-brand-blue font-bold">{seccionActivaNombre}</span>
                </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                {/* Selector de Periodo idéntico a Artemisa */}
                <div className="relative inline-flex items-center gap-2 bg-white/90 px-3.5 py-1.5 rounded-full border border-slate-200/80 shadow-2xs text-xs">
                    <svg className="w-4 h-4 text-brand-blue shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-semibold text-slate-700">Periodo:</span>
                    <select
                        value={periodoId}
                        onChange={(e) => setPeriodoId(e.target.value)}
                        aria-label="Seleccionar periodo institucional"
                        className="appearance-none bg-transparent font-bold text-slate-900 pr-4 cursor-pointer focus:outline-none"
                    >
                        {PERIODOS.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.codigo} — {p.nombre}
                            </option>
                        ))}
                    </select>
                    <span className="ml-1 px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-md bg-amber-50 text-amber-700 border border-amber-200/60">
                        {actual.estado}
                    </span>
                </div>

                {usuario && (
                    <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-brand-blue font-black text-xs flex items-center justify-center overflow-hidden border border-blue-200 shrink-0">
                            {usuario.photo ? (
                                <img src={usuario.photo} alt={nombreCompleto} className="w-full h-full object-cover" />
                            ) : (
                                inicial
                            )}
                        </div>
                        <div className="hidden md:block text-left">
                            <p className="text-xs font-bold text-slate-800 leading-tight">
                                {nombreCompleto}
                            </p>
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-brand-blue">
                                {rolLabel}
                            </span>
                        </div>
                    </div>
                )}

                {onCerrarSesion && (
                    <button
                        onClick={onCerrarSesion}
                        title="Cerrar sesión"
                        className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    >
                        Salir
                    </button>
                )}
            </div>
        </header>
    );
}
