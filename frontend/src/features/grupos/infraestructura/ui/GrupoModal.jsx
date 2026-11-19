import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../auth/aplicacion/AuthContext';
import { obtenerNombreCompleto } from '../../../auth/dominio/authModel';
import { crearGrupoBorrador } from '../../dominio/grupoModel';
import { searchDirectoryUsers } from '../api/gruposApi';
import {
    IconBrandMemorian,
    IconCommunityAcuerdos,
    IconDocumentActas,
    IconUsers,
} from '../../../../shared/components/ui/IconosMemorian';

export default function GrupoModal({ teachers = [], onClose, onSave, notify }) {
    const { user } = useAuth();
    const [form, setForm] = useState(() => ({
        ...crearGrupoBorrador(),
        advisor_id: user?.id || '',
        advisor_name: obtenerNombreCompleto(user),
    }));
    const [saving, setSaving] = useState(false);
    const [busquedaUsuario, setBusquedaUsuario] = useState('');
    const [sugerencias, setSugerencias] = useState([]);
    const [abiertoDirectorio, setAbiertoDirectorio] = useState(false);
    const [convocados, setConvocados] = useState([]);

    useEffect(() => {
        if (!busquedaUsuario.trim()) {
            setSugerencias(teachers.slice(0, 15));
            return;
        }
        const q = busquedaUsuario.trim();
        if (q.length < 2) return;
        searchDirectoryUsers(q)
            .then(({ data }) => setSugerencias(Array.isArray(data) ? data : []))
            .catch(() => setSugerencias([]));
    }, [busquedaUsuario, teachers]);

    const actualizarFeaturesConvocados = (lista) => {
        setConvocados(lista);
        setForm((f) => ({
            ...f,
            features: lista.map((item) => {
                const nombre = item.full_name || item.username;
                return item.cargo ? `${nombre} (${item.cargo})` : nombre;
            }).join(', '),
        }));
    };

    const agregarConvocado = (u) => {
        if (convocados.some((c) => c.id === u.id)) return;
        actualizarFeaturesConvocados([...convocados, u]);
        setBusquedaUsuario('');
        setAbiertoDirectorio(false);
    };

    const quitarConvocado = (id) => actualizarFeaturesConvocados(convocados.filter((c) => c.id !== id));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave({
                ...form,
                advisor_id: user?.id || form.advisor_id,
                advisor_name: obtenerNombreCompleto(user) || form.advisor_name,
            });
            onClose();
        } catch (err) {
            notify(err.message || 'Error al guardar el grupo.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const labelCls = 'text-[10px] font-black text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1.5';
    const inputCls = 'w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 shadow-2xs outline-none transition hover:border-slate-300 focus:border-brand-blue placeholder:font-medium placeholder:text-slate-400';

    return createPortal(
        <div
            className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
            onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}
        >
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-5 animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shadow-2xs shrink-0">
                            <IconBrandMemorian className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                GESTIÓN DE GRUPOS · FOR023GDC
                            </span>
                            <h4 className="text-sm font-black text-slate-900 tracking-tight">Crear Nuevo Grupo de Acta</h4>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer text-xs font-bold">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_165px] gap-3.5 items-start">
                        <div>
                            <label className={labelCls}>
                                <IconCommunityAcuerdos className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                                <span>NOMBRE DEL GRUPO</span>
                            </label>
                            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Ej. Comité Administrativo 2026-2" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>
                                <svg className="w-3.5 h-3.5 text-purple-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>FECHA INICIO</span>
                            </label>
                            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required className={inputCls} />
                        </div>
                    </div>

                    <div className="relative">
                        <label className={labelCls}>
                            <IconUsers className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>CONVOCAR PARTICIPANTES DEL DIRECTORIO</span>
                        </label>
                        <div className="relative">
                            <input type="text" value={busquedaUsuario} onFocus={() => setAbiertoDirectorio(true)} onChange={(e) => { setBusquedaUsuario(e.target.value); setAbiertoDirectorio(true); }} placeholder="Buscar y agregar por nombre, correo o cédula..." className={`${inputCls} pr-9`} />
                            <button type="button" onClick={() => setAbiertoDirectorio((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                        </div>

                        {abiertoDirectorio && sugerencias.length > 0 && (
                            <div className="absolute z-30 mt-1.5 w-full bg-white rounded-2xl border border-slate-200 shadow-2xl max-h-44 overflow-y-auto p-1.5 space-y-0.5">
                                {sugerencias.map((u) => (
                                    <button key={u.id} type="button" onClick={() => agregarConvocado(u)} className="w-full px-3 py-2 rounded-xl text-left text-xs hover:bg-blue-50 flex items-center justify-between gap-2 transition cursor-pointer">
                                        <span className="font-bold text-slate-800 truncate">{u.full_name || u.username} · <span className="font-medium text-slate-400">{u.email}</span></span>
                                        {(u.cargo || u.dependencia_nombre) && (
                                            <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-blue-50 text-brand-blue shrink-0">
                                                {[u.cargo, u.dependencia_nombre].filter(Boolean).join(' · ')}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {convocados.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2.5 p-2.5 rounded-2xl bg-slate-50/70 border border-slate-100">
                                {convocados.map((c) => (
                                    <span key={c.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs">
                                        <span className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
                                        {c.full_name || c.username}
                                        <button type="button" onClick={() => quitarConvocado(c.id)} className="ml-0.5 text-slate-400 hover:text-rose-600 cursor-pointer">✕</button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className={labelCls}>
                            <IconDocumentActas className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>DESCRIPCIÓN Y PROPÓSITO DEL GRUPO</span>
                        </label>
                        <textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Objetivo, alcance o temática de las sesiones de acta..." className={inputCls} />
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                        <button type="button" disabled={saving} onClick={onClose} className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer disabled:opacity-50">Cancelar</button>
                        <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-md cursor-pointer transition hover:scale-105 disabled:opacity-70">{saving ? 'Guardando…' : 'Guardar Grupo'}</button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
