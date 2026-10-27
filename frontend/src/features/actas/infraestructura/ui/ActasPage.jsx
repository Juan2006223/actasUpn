import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../auth/aplicacion/AuthContext';
import { useActas } from '../../aplicacion/useActas';
import { mkActa, filtrarMisActas } from '../../dominio/actaModel';
import * as actasApi from '../api/actasApi';
import ToastContainer, { useToast } from '../../../../shared/components/ui/Toast';
import ConfirmDialog, { useConfirm } from '../../../../shared/components/ui/ConfirmDialog';
import SignaturePad from './SignaturePad';
import GestionFirmaModal from './GestionFirmaModal';
import ActaCard from './ActaCard';
import ActasForm from './ActasForm';
import ActasPrintView from './ActasPrintView';
import ActasHeader from './ActasHeader';
import ActasFilters from './ActasFilters';
import { IconRoom, IconLocationPin, IconUsers } from '../../../../shared/components/ui/IconosMemorian';

const ITEMS_POR_PAGINA = 5;

export default function ActasPage() {
    const { user } = useAuth();
    const { toasts, addToast } = useToast();
    const { dlg: confirmDlg, show: showConfirm, close: closeConfirm } = useConfirm();
    const {
        actas, misActas, loading, firmaPersonal, setFirmaPersonal,
        saveActa, deleteActa, firmarActa, guardarFirmaPersonal, comentar, pendingCount, availableYears,
    } = useActas(user, addToast, actasApi);

    const [view, setView] = useState('list');
    const [prevView, setPrevView] = useState('list');
    const [current, setCurrent] = useState(null);
    const [seleccionada, setSeleccionada] = useState(null);
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [signingActaId, setSigningActaId] = useState(null);
    const [showGestionFirma, setShowGestionFirma] = useState(false);
    const [misFilter, setMisFilter] = useState('todas');
    const [misYear, setMisYear] = useState('');
    const [misSearch, setMisSearch] = useState('');
    const [orden, setOrden] = useState('fecha');
    const [pagina, setPagina] = useState(1);

    const isStudent = user?.role === 'STUDENT';
    useEffect(() => { if (isStudent && view === 'list') setView('mis'); }, [isStudent, view]);
    useEffect(() => { setPagina(1); }, [view, misFilter, misYear, misSearch, orden]);

    const handleNew = () => { if (isStudent) return; setCurrent(mkActa()); setStep(0); setView('form'); };
    const handleEdit = (a) => {
        if (isStudent) return;
        if (a.creador_id && String(a.creador_id) !== String(user?.id)) {
            addToast('Solo el creador puede editar', 'warning');
            return;
        }
        setCurrent({ ...a, isNew: false }); setStep(0); setView('form');
    };
    const handleView = (a) => { setCurrent({ ...a }); setPrevView(view); setView('preview'); };
    const handleDelete = (id) => {
        if (isStudent) return;
        showConfirm('Eliminar Acta', '¿Estás seguro? No se puede deshacer.', async () => {
            closeConfirm();
            await deleteActa(id);
            if (seleccionada?.id === id) setSeleccionada(null);
        }, true);
    };
    const handleSave = async () => { setSaving(true); const ok = await saveActa(current); setSaving(false); if (ok) setView('list'); };
    const handleSign = (actaId) => firmaPersonal ? firmarActa(actaId, firmaPersonal) : setSigningActaId(actaId);

    const baseSource = view === 'list' ? actas : misActas;
    const filteredList = useMemo(() => {
        const list = filtrarMisActas(baseSource, user?.id, misFilter, misYear, misSearch);
        return [...list].sort((a, b) => {
            if (orden === 'numero') return String(a.numero || '').localeCompare(String(b.numero || ''));
            if (orden === 'instancia') return String(a.instancias || '').localeCompare(String(b.instancias || ''));
            return String(b.fecha || '').localeCompare(String(a.fecha || ''));
        });
    }, [baseSource, user, misFilter, misYear, misSearch, orden]);

    const totalPaginas = Math.ceil(filteredList.length / ITEMS_POR_PAGINA) || 1;
    const inicio = (pagina - 1) * ITEMS_POR_PAGINA;
    const paginadas = filteredList.slice(inicio, inicio + ITEMS_POR_PAGINA);
    const firmadasCount = useMemo(() => actas.filter((a) => (a.firmas || []).some((f) => f.firmado)).length, [actas]);
    const participantesCount = useMemo(() => actas.reduce((acc, a) => acc + ((a.firmas || []).length || (a.asistentes || []).length), 0), [actas]);

    useEffect(() => {
        if (!filteredList.length) { setSeleccionada(null); return; }
        const existe = seleccionada && filteredList.find((a) => a.id === seleccionada.id);
        setSeleccionada(existe || filteredList[0]);
    }, [filteredList]);

    if (view === 'preview' && current) return <ActasPrintView acta={current} onBack={() => setView(prevView)} />;
    if (view === 'form' && current && !isStudent) {
        return <ActasForm acta={current} step={step} setStep={setStep} user={user} onChange={setCurrent} onSave={handleSave} saving={saving} onPreview={() => { setPrevView('form'); setView('preview'); }} onBack={() => setView('list')} />;
    }

    return (
        <>
            <ToastContainer toasts={toasts} />
            <ConfirmDialog {...confirmDlg} />
            {signingActaId && <SignaturePad open={true} userName={`${user?.first_name} ${user?.last_name}`} onClose={() => setSigningActaId(null)} onConfirm={async (f) => { await firmarActa(signingActaId, f); setSigningActaId(null); }} />}
            {showGestionFirma && <GestionFirmaModal firmaActual={firmaPersonal} onSave={async (d) => { await guardarFirmaPersonal(d); setShowGestionFirma(false); }} onDelete={() => setFirmaPersonal(null)} onClose={() => setShowGestionFirma(false)} />}

            <section className="space-y-6">
                <ActasHeader isStudent={isStudent} onNewActa={handleNew} view={view} setView={setView} allActasCount={actas.length} myActasCount={misActas.length} firmadasCount={firmadasCount} participantesCount={participantesCount} pendingCount={pendingCount} firmaPersonal={firmaPersonal} onOpenGestionFirma={() => setShowGestionFirma(true)} />
                <ActasFilters misFilter={misFilter} setMisFilter={setMisFilter} misYear={misYear} setMisYear={setMisYear} misSearch={misSearch} setMisSearch={setMisSearch} orden={orden} setOrden={setOrden} availableYears={availableYears} />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-7">
                        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <h3 className="text-sm font-black text-slate-900">{view === 'list' ? 'Todas las actas' : 'Mis actas'}</h3>
                                    <p className="text-xs font-semibold text-slate-500">{filteredList.length} resultados</p>
                                </div>
                                {!isStudent && <button type="button" onClick={handleNew} className="text-xs font-black text-emerald-600 hover:text-emerald-700 cursor-pointer">+ Nueva acta</button>}
                            </div>

                            {loading ? (
                                <div className="py-12 text-center text-xs font-bold text-slate-400">Cargando actas...</div>
                            ) : filteredList.length === 0 ? (
                                <div className="py-12 text-center space-y-3">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto"><IconRoom className="w-6 h-6" /></div>
                                    <p className="text-xs font-bold text-slate-600">No se encontraron actas registradas</p>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {paginadas.map((a) => {
                                        const isSelected = seleccionada?.id === a.id;
                                        const mainColor = '#EC4899';
                                        const personas = (a.firmas || []).length || (a.asistentes || []).length || 1;
                                        return (
                                            <div key={a.id} onClick={() => setSeleccionada(a)} style={isSelected ? { borderColor: mainColor, backgroundColor: `${mainColor}14` } : undefined} className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${isSelected ? 'shadow-xs ring-1 ring-offset-0' : 'border-slate-200/80 bg-white hover:bg-slate-50'}`}>
                                                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                                    <div style={{ backgroundColor: mainColor }} className="w-10 h-10 rounded-xl text-white flex items-center justify-center shrink-0 shadow-xs"><IconRoom className="w-5 h-5" /></div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-black text-slate-900 truncate">{a.numero ? `Acta ${a.numero}` : `Acta #${a.id}`}</span>
                                                            <span className="text-[9px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-extrabold">{a.tipo || 'Regular'}</span>
                                                            <span className="text-[9px] px-2 py-0.5 rounded-full font-black border bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]">Activo</span>
                                                        </div>
                                                        <p className="text-[11px] font-bold text-slate-400 mt-0.5 truncate">Salón / Lugar {a.lugar || 'UPN'} · Código {a.numero || '01'} · {a.instancias || 'FOR023GDC'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 shrink-0 text-xs font-bold text-slate-600">
                                                    <span className="hidden sm:flex items-center gap-1"><IconLocationPin className="w-3.5 h-3.5 text-slate-400" /> {a.lugar || a.fecha || 'UPN'}</span>
                                                    <span className="hidden md:flex items-center gap-1"><IconUsers className="w-3.5 h-3.5 text-slate-400" /> {personas} personas</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {filteredList.length > 0 && (
                                <div className="flex items-center justify-center gap-3 pt-3 border-t border-slate-100">
                                    <button type="button" disabled={pagina === 1} onClick={() => setPagina((p) => Math.max(1, p - 1))} className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer text-xs font-bold">‹</button>
                                    <span className="text-xs font-bold text-slate-600">{inicio + 1}–{Math.min(inicio + ITEMS_POR_PAGINA, filteredList.length)} de {filteredList.length}</span>
                                    <button type="button" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer text-xs font-bold">›</button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-5">
                        <ActaCard acta={seleccionada} userId={user?.id} onEdit={!isStudent ? () => handleEdit(seleccionada) : undefined} onDelete={!isStudent ? () => handleDelete(seleccionada.id) : undefined} onView={() => handleView(seleccionada)} onSign={() => handleSign(seleccionada.id)} onComment={(id, txt) => comentar(id, txt)} />
                    </div>
                </div>
            </section>
        </>
    );
}
