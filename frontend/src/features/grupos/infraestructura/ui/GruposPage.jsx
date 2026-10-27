import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/aplicacion/AuthContext';
import { puedeGestionarGrupos } from '../../../auth/dominio/authModel';
import { useGrupos } from '../../aplicacion/useGrupos';
import { resolverNombreAsesor } from '../../dominio/grupoModel';
import * as gruposApi from '../api/gruposApi';
import GrupoModal from './GrupoModal';
import DetalleGrupoInspector, { KpiStatsGruposRow } from './DetalleGrupoInspector';
import { IconRoom, IconDashboard, IconSearch, IconLocationPin, IconUsers } from '../../../../shared/components/ui/IconosMemorian';

const ITEMS_POR_PAGINA = 5;

export default function GruposPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);
    const [toast, setToast] = useState(null);
    const [categoriaTab, setCategoriaTab] = useState('ORDINARIO');
    const [busqueda, setBusqueda] = useState('');
    const [creadorFiltro, setCreadorFiltro] = useState('');
    const [estadoFiltro, setEstadoFiltro] = useState('');
    const [orden, setOrden] = useState('nombre');
    const [pagina, setPagina] = useState(1);
    const [seleccionado, setSeleccionado] = useState(null);

    const notify = useCallback((msg, type = 'success') => setToast({ msg, type }), []);
    const { grupos, teachers, loading, guardarGrupo, eliminarGrupo } = useGrupos(notify, gruposApi);

    useEffect(() => { setPagina(1); }, [busqueda, creadorFiltro, estadoFiltro, orden, categoriaTab]);
    useEffect(() => {
        if (!grupos.length) { setSeleccionado(null); return; }
        const act = seleccionado && grupos.find((g) => g.id === seleccionado.id);
        setSeleccionado(act || grupos[0]);
    }, [grupos]);

    if (user && !puedeGestionarGrupos(user)) return <Navigate to="/actas" replace />;

    const misGruposCount = useMemo(() => grupos.filter((g) => String(g.advisor_id) === String(user?.id)).length, [grupos, user]);

    const filtrados = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        const list = grupos.filter((g) => {
            const matchCat = categoriaTab === 'MIS_GRUPOS' ? String(g.advisor_id) === String(user?.id) : true;
            const asesor = resolverNombreAsesor(g, teachers);
            const matchQ = `${g.id} ${g.name} ${asesor} ${g.features || ''} ${g.description || ''}`.toLowerCase().includes(q);
            const matchCreador = !creadorFiltro || asesor === creadorFiltro;
            const matchEstado = !estadoFiltro || (estadoFiltro === 'CON_CONVOCADOS' ? Boolean((g.features || '').trim()) : true);
            return matchCat && matchQ && matchCreador && matchEstado;
        });
        return [...list].sort((a, b) => {
            if (orden === 'codigo') return (a.id || 0) - (b.id || 0);
            if (orden === 'capacidad') return (b.student_count || 0) - (a.student_count || 0);
            return (a.name || '').localeCompare(b.name || '');
        });
    }, [grupos, teachers, categoriaTab, busqueda, creadorFiltro, estadoFiltro, orden, user]);

    const totalPaginas = Math.ceil(filtrados.length / ITEMS_POR_PAGINA) || 1;
    const inicio = (pagina - 1) * ITEMS_POR_PAGINA;
    const paginados = filtrados.slice(inicio, inicio + ITEMS_POR_PAGINA);
    const creadoresUnicos = useMemo(() => Array.from(new Set(grupos.map((g) => resolverNombreAsesor(g, teachers)).filter(Boolean))), [grupos, teachers]);

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar este grupo?')) return;
        try { await eliminarGrupo(id); if (seleccionado?.id === id) setSeleccionado(null); }
        catch { notify('Error al eliminar', 'error'); }
    };

    return (
        <section className="space-y-5" aria-labelledby="grupos-titulo">
            <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E7F8F2] text-[#008A63]"><IconRoom className="h-6 w-6" /></span>
                    <div>
                        <h1 id="grupos-titulo" className="text-xl font-black tracking-tight text-[#0F172A]">Gestión de grupos</h1>
                        <p className="mt-1 text-sm text-slate-500">Grupos activos asignados a Memorian, disponibles para esta programación de actas.</p>
                    </div>
                </div>
                <nav aria-label="Acciones de grupos" className="inline-flex shrink-0 overflow-hidden rounded-2xl border border-[#D9E3F1] bg-white shadow-sm">
                    <button type="button" onClick={() => navigate('/actas')} className="flex items-center gap-2 border-r border-[#D9E3F1] px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer"><span aria-hidden="true" className="text-lg leading-none">←</span> Actas</button>
                    <button type="button" onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer"><IconDashboard className="h-4 w-4 text-blue-600" /> Nuevo grupo</button>
                </nav>
            </header>

            <div className="flex flex-wrap items-center gap-2" aria-label="Categoría de grupos">
                <button type="button" onClick={() => setCategoriaTab('ORDINARIO')} className={`rounded-full border px-4 py-2 text-xs font-bold cursor-pointer ${categoriaTab === 'ORDINARIO' ? 'border-slate-200 bg-white text-slate-900 shadow-sm' : 'border-transparent text-slate-500'}`}>Todos los grupos <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5">{grupos.length}</span></button>
                <button type="button" onClick={() => setCategoriaTab('MIS_GRUPOS')} className={`rounded-full border px-4 py-2 text-xs font-bold cursor-pointer ${categoriaTab === 'MIS_GRUPOS' ? 'border-slate-200 bg-white text-slate-900 shadow-sm' : 'border-transparent text-slate-500'}`}>Mis grupos <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5">{misGruposCount}</span></button>
            </div>

            <div className="space-y-6">
                <KpiStatsGruposRow grupos={grupos} />
                <div className="w-full flex flex-wrap lg:flex-nowrap items-center gap-3">
                    <div className="relative flex-1 min-w-[240px]">
                        <IconSearch className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                        <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por código, nombre, creador o integrante..." className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl bg-white border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition shadow-2xs" />
                    </div>
                    <select value={creadorFiltro} onChange={(e) => setCreadorFiltro(e.target.value)} className="px-3.5 py-2.5 text-xs rounded-2xl bg-white border border-slate-200 font-bold text-slate-700 cursor-pointer shrink-0 shadow-2xs">
                        <option value="">Todos los creadores</option>
                        {creadoresUnicos.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className="px-3.5 py-2.5 text-xs rounded-2xl bg-white border border-slate-200 font-bold text-slate-700 cursor-pointer shrink-0 shadow-2xs">
                        <option value="">Todos los estados</option>
                        <option value="ACTIVO">Activos</option>
                        <option value="CON_CONVOCADOS">Con convocados</option>
                    </select>
                    <select value={orden} onChange={(e) => setOrden(e.target.value)} className="px-3.5 py-2.5 text-xs rounded-2xl bg-white border border-slate-200 font-bold text-slate-700 cursor-pointer shrink-0 shadow-2xs">
                        <option value="nombre">Ordenar: Nombre</option>
                        <option value="codigo">Ordenar: Código</option>
                        <option value="capacidad">Ordenar: Capacidad</option>
                    </select>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-7">
                        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <h3 className="text-sm font-black text-slate-900">{categoriaTab === 'MIS_GRUPOS' ? 'Mis grupos' : 'Todos los grupos'}</h3>
                                    <p className="text-xs font-semibold text-slate-500">{filtrados.length} resultados</p>
                                </div>
                                <button type="button" onClick={() => setShowModal(true)} className="text-xs font-black text-emerald-600 hover:text-emerald-700 cursor-pointer">+ Nuevo grupo</button>
                            </div>

                            {loading ? (
                                <div className="py-12 text-center text-xs font-bold text-slate-400">Cargando grupos...</div>
                            ) : filtrados.length === 0 ? (
                                <div className="py-12 text-center space-y-3">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto"><IconRoom className="w-6 h-6" /></div>
                                    <p className="text-xs font-bold text-slate-600">No hay grupos registrados en esta vista</p>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {paginados.map((g) => {
                                        const isSelected = seleccionado?.id === g.id;
                                        const mainColor = '#EC4899';
                                        const asesor = resolverNombreAsesor(g, teachers) || 'Memorian';
                                        const personas = g.student_count || g.students?.length || 1;
                                        return (
                                            <div key={g.id} onClick={() => setSeleccionado(g)} style={isSelected ? { borderColor: mainColor, backgroundColor: `${mainColor}14` } : undefined} className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${isSelected ? 'shadow-xs ring-1 ring-offset-0' : 'border-slate-200/80 bg-white hover:bg-slate-50'}`}>
                                                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                                    <div style={{ backgroundColor: mainColor }} className="w-10 h-10 rounded-xl text-white flex items-center justify-center shrink-0 shadow-xs"><IconRoom className="w-5 h-5" /></div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-black text-slate-900 truncate">{g.name}</span>
                                                            <span className="text-[9px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-extrabold">Regular</span>
                                                            <span className="text-[9px] px-2 py-0.5 rounded-full font-black border bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]">Activo</span>
                                                        </div>
                                                        <p className="text-[11px] font-bold text-slate-400 mt-0.5 truncate">Grupo {g.id} · Código {String(g.id).padStart(2, '0')} · {asesor}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 shrink-0 text-xs font-bold text-slate-600">
                                                    <span className="hidden sm:flex items-center gap-1"><IconLocationPin className="w-3.5 h-3.5 text-slate-400" /> {g.date}</span>
                                                    <span className="hidden md:flex items-center gap-1"><IconUsers className="w-3.5 h-3.5 text-slate-400" /> {personas} personas</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {filtrados.length > 0 && (
                                <div className="flex items-center justify-center gap-3 pt-3 border-t border-slate-100">
                                    <button type="button" disabled={pagina === 1} onClick={() => setPagina((p) => Math.max(1, p - 1))} className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer text-xs font-bold">‹</button>
                                    <span className="text-xs font-bold text-slate-600">{inicio + 1}–{Math.min(inicio + ITEMS_POR_PAGINA, filtrados.length)} de {filtrados.length}</span>
                                    <button type="button" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer text-xs font-bold">›</button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-5">
                        <DetalleGrupoInspector grupo={seleccionado} nombreAsesor={seleccionado ? resolverNombreAsesor(seleccionado, teachers) : ''} onDelete={handleDelete} />
                    </div>
                </div>
            </div>

            {showModal && <GrupoModal teachers={teachers} onClose={() => setShowModal(false)} onSave={guardarGrupo} notify={notify} />}
            {toast && <div className={`fixed bottom-5 right-5 z-[9999] px-5 py-3 rounded-2xl text-white text-xs font-bold shadow-xl ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`} onAnimationEnd={() => setTimeout(() => setToast(null), 2500)}>{toast.msg}</div>}
        </section>
    );
}
