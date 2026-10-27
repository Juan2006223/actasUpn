import React, { useState, useEffect } from 'react';
import { ROLES_DISPONIBLES } from '../../dominio/usuarioModel';

export default function UsuarioRolModal({
    usuario,
    procesando,
    onCerrar,
    onConfirmar,
}) {
    const [rolSeleccionado, setRolSeleccionado] = useState(usuario?.role || 'TEACHER');

    useEffect(() => {
        if (usuario) {
            setRolSeleccionado(usuario.role);
        }
    }, [usuario]);

    if (!usuario) return null;

    const nombreCompleto = `${usuario.first_name || ''} ${usuario.last_name || ''}`.trim()
        || usuario.full_name
        || usuario.username;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rolSeleccionado === usuario.role) {
            onCerrar();
            return;
        }
        await onConfirmar(usuario.id, rolSeleccionado);
        onCerrar();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
                    <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                            Seguridad &amp; Permisos (RBAC)
                        </span>
                        <h3 className="text-lg font-extrabold text-slate-900 mt-2">
                            Asignar Rol y Permisos de Acceso
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Usuario: <strong className="text-slate-700">{nombreCompleto}</strong> ({usuario.email})
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCerrar}
                        className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                    <div className="space-y-3">
                        {ROLES_DISPONIBLES.map((r) => {
                            const seleccionado = rolSeleccionado === r.id;
                            return (
                                <label
                                    key={r.id}
                                    onClick={() => setRolSeleccionado(r.id)}
                                    className={`block p-4 rounded-2xl border-2 transition cursor-pointer ${
                                        seleccionado
                                            ? 'border-slate-900 bg-slate-50/70 shadow-2xs'
                                            : 'border-slate-100 hover:border-slate-200 bg-white'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <input
                                                type="radio"
                                                name="rol"
                                                checked={seleccionado}
                                                onChange={() => setRolSeleccionado(r.id)}
                                                className="accent-slate-900"
                                            />
                                            <span className="text-sm font-extrabold text-slate-800">
                                                {r.nombre}
                                            </span>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${r.badge}`}>
                                            {r.id}
                                        </span>
                                    </div>

                                    <p className="text-[11px] font-semibold text-slate-500 mt-1.5 ml-6">
                                        Stakeholder: <span className="text-slate-700">{r.stakeholder}</span>
                                    </p>

                                    <ul className="mt-2.5 ml-6 space-y-1">
                                        {r.permisos.map((perm, idx) => (
                                            <li key={idx} className="text-[11px] text-slate-600 flex items-center gap-1.5">
                                                <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                                                {perm}
                                            </li>
                                        ))}
                                    </ul>
                                </label>
                            );
                        })}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={onCerrar}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={procesando}
                            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
                        >
                            {procesando ? 'Guardando cambios...' : 'Guardar y Aplicar Permisos'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
