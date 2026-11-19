import React, { useState } from 'react';

/** Lista de dependencias que administra el superadministrador. */
export default function DependenciasPanel({ dependencias = [], onCrear, onActualizar, onEliminar }) {
    const [nombre, setNombre] = useState('');
    const [editando, setEditando] = useState(null);
    const [mensaje, setMensaje] = useState(null);
    const [ocupado, setOcupado] = useState(false);

    const ejecutar = async (accion, exito) => {
        setOcupado(true);
        setMensaje(null);
        const res = await accion();
        setOcupado(false);
        setMensaje(res.ok ? { tipo: 'ok', texto: exito } : { tipo: 'error', texto: res.error });
        return res.ok;
    };

    const crear = async (e) => {
        e.preventDefault();
        if (!nombre.trim()) return;
        if (await ejecutar(() => onCrear(nombre.trim()), 'Dependencia creada.')) setNombre('');
    };

    const guardarNombre = async (e) => {
        e.preventDefault();
        if (await ejecutar(() => onActualizar(editando.id, { nombre: editando.nombre }), 'Nombre actualizado.')) setEditando(null);
    };

    return (
        <div className="space-y-4">
            <form onSubmit={crear} className="flex flex-col sm:flex-row gap-2 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs">
                <label htmlFor="nueva-dependencia" className="sr-only">Nueva dependencia</label>
                <input id="nueva-dependencia" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={150}
                    placeholder="Nombre de la dependencia (ej. CINNDET, Facultad de Educación)"
                    className="flex-1 px-3.5 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200/80 rounded-xl focus:bg-white focus:border-brand-blue outline-none" />
                <button type="submit" disabled={ocupado || !nombre.trim()}
                    className="px-4 py-2 text-xs font-bold text-white bg-brand-blue hover:bg-blue-600 rounded-xl disabled:opacity-50 cursor-pointer">
                    + Agregar dependencia
                </button>
            </form>

            {mensaje && (
                <div role={mensaje.tipo === 'error' ? 'alert' : 'status'}
                    className={`p-3 text-xs font-semibold rounded-2xl border ${mensaje.tipo === 'ok'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80' : 'bg-rose-50 text-rose-700 border-rose-200/80'}`}>
                    {mensaje.texto}
                </div>
            )}

            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-2xs">
                {dependencias.length === 0 ? (
                    <p className="py-12 text-center text-xs font-bold text-slate-500">Todavía no hay dependencias.</p>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {dependencias.map((d) => (
                            <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs">
                                {editando?.id === d.id ? (
                                    <form onSubmit={guardarNombre} className="flex flex-1 gap-2">
                                        <label htmlFor={`dep-${d.id}`} className="sr-only">Nombre</label>
                                        <input id={`dep-${d.id}`} autoFocus value={editando.nombre} maxLength={150}
                                            onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                                            className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-brand-blue" />
                                        <button type="submit" disabled={ocupado} className="px-3 py-1.5 font-bold text-white bg-slate-900 rounded-lg cursor-pointer">Guardar</button>
                                        <button type="button" onClick={() => setEditando(null)} className="px-3 py-1.5 font-bold text-slate-600 bg-slate-100 rounded-lg cursor-pointer">Cancelar</button>
                                    </form>
                                ) : (
                                    <>
                                        <div>
                                            <p className={`font-bold ${d.activa ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{d.nombre}</p>
                                            <p className="text-[10px] text-slate-400">
                                                {d.num_usuarios} {d.num_usuarios === 1 ? 'usuario' : 'usuarios'}{d.activa ? '' : ' · inactiva'}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => setEditando({ id: d.id, nombre: d.nombre })}
                                                className="px-3 py-1.5 font-bold text-brand-blue bg-blue-50/70 hover:bg-blue-100 rounded-xl cursor-pointer">
                                                Renombrar
                                            </button>
                                            <button type="button" disabled={ocupado}
                                                onClick={() => ejecutar(() => onActualizar(d.id, { activa: !d.activa }), d.activa ? 'Dependencia desactivada.' : 'Dependencia activada.')}
                                                className="px-3 py-1.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">
                                                {d.activa ? 'Desactivar' : 'Activar'}
                                            </button>
                                            {d.num_usuarios === 0 && (
                                                <button type="button" disabled={ocupado}
                                                    onClick={() => ejecutar(() => onEliminar(d.id), 'Dependencia eliminada.')}
                                                    className="px-3 py-1.5 font-bold text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-xl cursor-pointer">
                                                    Eliminar
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
