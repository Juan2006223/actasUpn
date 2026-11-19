import React from 'react';

export default function UsuarioFiltrosBar({
    busqueda,
    onBusquedaChange,
    rolFiltro,
    onRolFiltroChange,
}) {
    const roles = [
        { id: 'TODOS', label: 'Todos' },
        { id: 'REDACTOR', label: 'Redactores' },
        { id: 'REVISOR', label: 'Revisores' },
        { id: 'ADMIN', label: 'Superadministradores' },
    ];

    return (
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs">
            <div className="relative flex-1 max-w-sm">
                <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => onBusquedaChange(e.target.value)}
                    placeholder="Buscar por nombre, correo, cédula, cargo o dependencia..."
                    className="w-full pl-3.5 pr-3.5 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200/80 rounded-xl focus:bg-white focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition placeholder:text-slate-400"
                />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                {roles.map((r) => {
                    const activo = rolFiltro === r.id;
                    return (
                        <button
                            key={r.id}
                            type="button"
                            onClick={() => onRolFiltroChange(r.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                                activo
                                    ? 'bg-slate-900 text-white shadow-2xs'
                                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70'
                            }`}
                        >
                            {r.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
