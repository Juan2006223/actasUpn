import React from 'react';

const CLASE_CAMPO = 'w-full px-3.5 py-2.5 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition';

/** Cargo y dependencia: aparecen en la tabla de asistentes del acta (columna Cargo/Dependencia). */
export default function CamposCargoDependencia({ cargo, onCargo, dependenciaId, onDependencia, dependencias = [] }) {
    const opciones = dependencias.filter((d) => d.activa || String(d.id) === String(dependenciaId));
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
                <label htmlFor="campo-cargo" className="text-[11px] font-bold text-slate-700 block mb-1">Cargo principal</label>
                <input id="campo-cargo" type="text" value={cargo} maxLength={150} onChange={(e) => onCargo(e.target.value)}
                    placeholder="Ej. Director, Docente, Diseñador" className={CLASE_CAMPO} />
            </div>
            <div>
                <label htmlFor="campo-dependencia" className="text-[11px] font-bold text-slate-700 block mb-1">Dependencia</label>
                <select id="campo-dependencia" value={dependenciaId} onChange={(e) => onDependencia(e.target.value)}
                    className={`${CLASE_CAMPO} font-semibold`}>
                    <option value="">Sin dependencia</option>
                    {opciones.map((d) => (
                        <option key={d.id} value={String(d.id)}>{d.nombre}{d.activa ? '' : ' (inactiva)'}</option>
                    ))}
                </select>
                {!dependencias.length && (
                    <p className="text-[10px] text-slate-400 mt-1">Crea las dependencias en la pestaña "Dependencias".</p>
                )}
            </div>
        </div>
    );
}
