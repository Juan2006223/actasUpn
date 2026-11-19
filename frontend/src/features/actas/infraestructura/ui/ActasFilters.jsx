import React from 'react';
import { IconSearch } from '../../../../shared/components/ui/IconosMemorian';

export default function ActasFilters({
    misFilter,
    setMisFilter,
    misYear,
    setMisYear,
    misSearch,
    setMisSearch,
    orden = 'fecha',
    setOrden,
    availableYears = [],
}) {
    return (
        <div className="w-full flex flex-wrap lg:flex-nowrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
                <IconSearch className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    value={misSearch}
                    onChange={(e) => setMisSearch(e.target.value)}
                    placeholder="Buscar por código, número, instancia, lugar o tema..."
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl bg-white border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition shadow-2xs"
                />
            </div>

            <select
                value={misYear}
                onChange={(e) => setMisYear(e.target.value)}
                className="px-3.5 py-2.5 text-xs rounded-2xl bg-white border border-slate-200 font-bold text-slate-700 cursor-pointer shrink-0 shadow-2xs"
            >
                <option value="">Todas las sedes / años</option>
                {availableYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                ))}
            </select>

            <label htmlFor="filtro-estado" className="sr-only">Estado</label>
            <select
                id="filtro-estado"
                value={misFilter}
                onChange={(e) => setMisFilter(e.target.value)}
                className="px-3.5 py-2.5 text-xs rounded-2xl bg-white border border-slate-200 font-bold text-slate-700 cursor-pointer shrink-0 shadow-2xs"
            >
                <option value="todas">Todos los estados</option>
                <option value="borradores">Borradores</option>
                <option value="revision">Por revisar (soy revisor)</option>
                <option value="pendientes">Me falta firmar</option>
                <option value="firmadas">Ya firmé</option>
            </select>

            <select
                value={orden}
                onChange={(e) => setOrden?.(e.target.value)}
                className="px-3.5 py-2.5 text-xs rounded-2xl bg-white border border-slate-200 font-bold text-slate-700 cursor-pointer shrink-0 shadow-2xs"
            >
                <option value="fecha">Ordenar: Fecha</option>
                <option value="numero">Ordenar: Número</option>
                <option value="instancia">Ordenar: Nombre</option>
            </select>
        </div>
    );
}
