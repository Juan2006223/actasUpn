import React, { useState, useEffect } from 'react';
import { ROLES_DISPONIBLES, ROL_POR_DEFECTO } from '../../dominio/usuarioModel';
import CamposCargoDependencia from './CamposCargoDependencia';

/** El superadministrador ajusta rol en la plataforma, cargo y dependencia de una persona. */
export default function UsuarioRolModal({ usuario, dependencias = [], procesando, esMismoUsuario, onCerrar, onConfirmar }) {
    const [rol, setRol] = useState(ROL_POR_DEFECTO);
    const [cargo, setCargo] = useState('');
    const [dependenciaId, setDependenciaId] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!usuario) return;
        setRol(usuario.role || ROL_POR_DEFECTO);
        setCargo(usuario.cargo || '');
        setDependenciaId(usuario.dependencia_id ? String(usuario.dependencia_id) : '');
        setError(null);
    }, [usuario]);

    if (!usuario) return null;

    const nombreCompleto = `${usuario.first_name || ''} ${usuario.last_name || ''}`.trim()
        || usuario.full_name
        || usuario.username;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const datos = { cargo: cargo.trim(), dependencia_id: dependenciaId ? Number(dependenciaId) : null };
        if (!esMismoUsuario) datos.role = rol;
        const res = await onConfirmar(usuario.id, datos);
        if (res?.ok === false) {
            setError(res.error);
            return;
        }
        onCerrar();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div role="dialog" aria-modal="true" aria-labelledby="titulo-editar-usuario"
                className="bg-white w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0">
                    <div>
                        <h3 id="titulo-editar-usuario" className="text-lg font-extrabold text-slate-900">Editar usuario</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            <strong className="text-slate-700">{nombreCompleto}</strong>
                            {usuario.email ? ` (${usuario.email})` : ` · ${usuario.username}`}
                        </p>
                    </div>
                    <button type="button" onClick={onCerrar} aria-label="Cerrar"
                        className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold cursor-pointer">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
                    <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
                        {error && (
                            <div role="alert" className="p-3 text-xs font-semibold rounded-2xl border bg-rose-50 text-rose-700 border-rose-200/80">{error}</div>
                        )}

                        <CamposCargoDependencia cargo={cargo} onCargo={setCargo} dependenciaId={dependenciaId}
                            onDependencia={setDependenciaId} dependencias={dependencias} />

                        <fieldset className="space-y-2.5" disabled={esMismoUsuario}>
                            <legend className="text-[11px] font-bold text-slate-700 mb-1">Rol en la plataforma</legend>
                            {esMismoUsuario && (
                                <p className="text-[11px] text-slate-500">No puedes cambiar tu propio rol.</p>
                            )}
                            {ROLES_DISPONIBLES.map((r) => {
                                const seleccionado = rol === r.id;
                                return (
                                    <label key={r.id}
                                        className={`block p-3.5 rounded-2xl border-2 transition ${esMismoUsuario ? 'opacity-60' : 'cursor-pointer'} ${
                                            seleccionado ? 'border-slate-900 bg-slate-50/70 shadow-2xs' : 'border-slate-100 hover:border-slate-200 bg-white'
                                        }`}>
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2.5">
                                                <input type="radio" name="rol" checked={seleccionado} onChange={() => setRol(r.id)} className="accent-slate-900" />
                                                <span className="text-sm font-extrabold text-slate-800">{r.nombre}</span>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${r.badge}`}>{r.subtitulo}</span>
                                        </div>
                                        <ul className="mt-1.5 ml-6 space-y-0.5">
                                            {r.permisos.map((perm) => (
                                                <li key={perm} className="text-[11px] text-slate-600 flex items-center gap-1.5">
                                                    <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                                                    {perm}
                                                </li>
                                            ))}
                                        </ul>
                                    </label>
                                );
                            })}
                            {rol === 'REVISOR' && !dependenciaId && (
                                <p className="text-[11px] font-semibold text-amber-700">
                                    Asigna una dependencia: el revisor solo revisa las actas de su dependencia.
                                </p>
                            )}
                        </fieldset>
                    </div>

                    <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2.5 shrink-0">
                        <button type="button" onClick={onCerrar}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer">
                            Cancelar
                        </button>
                        <button type="submit" disabled={procesando}
                            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition cursor-pointer disabled:opacity-50">
                            {procesando ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
