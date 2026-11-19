import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Save, Eye, Printer, History } from 'lucide-react';
import EstadoAutoguardado from './EstadoAutoguardado';
import GrabacionPanel from './GrabacionPanel';
import ObservacionesActa from './ObservacionesActa';
import { formatoFecha } from './BorradoresPendientes';
import CourseImportModal from './CourseImportModal';
import { Sec, StepInfoGeneral, StepAgenda, StepResultados, StepFirmas } from './ActaFormStepGeneral';
import {
    sincronizarFirmasConParticipantes,
    importarCursoEnActa,
    agregarMiFirmaEnActa
} from '../../dominio/actaModel';

const STEPS = ['Info. General', 'Agenda', 'Resultados', 'Firmas'];

export default function ActasForm({ acta, step, setStep, user, onChange, onSave, onPreview, onBack, saving = false, autoguardado, recuperadoEn, onDescartarRecuperado }) {
    const set = (field, val) => onChange(p => ({ ...p, [field]: val }));
    const setRow = (field, idx, key, val) => onChange(p => {
        const arr = [...p[field]]; arr[idx] = { ...arr[idx], [key]: val }; return { ...p, [field]: arr };
    });
    const addRow = (field, empty) => onChange(p => ({ ...p, [field]: [...p[field], { ...empty }] }));
    const delRow = (field, idx) => onChange(p => ({ ...p, [field]: p[field].filter((_, i) => i !== idx) }));

    useEffect(() => {
        if (step !== 3) return;
        onChange(p => ({ ...p, firmas: sincronizarFirmasConParticipantes(p) }));
    }, [step]);

    const [importTarget, setImportTarget] = useState(null);

    const handleCourseImport = (course) => {
        onChange(p => importarCursoEnActa(p, course, importTarget));
        setImportTarget(null);
    };

    const addMySig = () => onChange(p => agregarMiFirmaEnActa(p, user));

    return (
        <div className="space-y-5 pb-10">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"><ChevronLeft className="h-5 w-5" /></button>
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Acta — {acta.tipo}</h1>
                    <p className="text-slate-400 text-xs">FOR023GDC · UPN · Los participantes buscan desde el directorio</p>
                    {autoguardado && <div className="mt-1"><EstadoAutoguardado estado={autoguardado.estado} ultimoGuardado={autoguardado.ultimoGuardado} /></div>}
                </div>
                <div className="ml-auto flex gap-2">
                    <button onClick={onPreview} className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm transition-all"><Eye className="h-4 w-4" /> Vista Previa</button>
                    <button onClick={onSave} disabled={saving} className="inline-flex items-center gap-2 bg-ilinyx-700 hover:bg-ilinyx-800 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all shadow-md disabled:opacity-60"><Save className="h-4 w-4" /> {saving ? 'Guardando…' : 'Guardar'}</button>
                </div>
            </div>

            {recuperadoEn && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
                    <p className="flex items-center gap-2 text-sm text-amber-800">
                        <History className="h-4 w-4" />
                        Se recuperaron cambios sin guardar ({formatoFecha(recuperadoEn)})
                    </p>
                    <button type="button" onClick={onDescartarRecuperado} className="text-xs font-bold text-amber-800 hover:underline cursor-pointer">
                        Descartarlos y volver a la última versión guardada
                    </button>
                </div>
            )}

            {(acta.comentarios || []).length > 0 && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 px-4 py-3">
                    <ObservacionesActa observaciones={acta.comentarios} puedeComentar={false} compacto />
                </div>
            )}

            <GrabacionPanel acta={acta} onChange={onChange} />

            <div className="flex items-center gap-2">
                {STEPS.map((s, i) => (
                    <React.Fragment key={s}>
                        <button onClick={() => setStep(i)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${step === i ? 'bg-ilinyx-700 text-white shadow' : i < step ? 'bg-ilinyx-50 text-ilinyx-700' : 'bg-slate-100 text-slate-400'}`}>
                            <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${step === i ? 'bg-white/20' : ''}`}>{i + 1}</span>
                            <span className="hidden sm:inline">{s}</span>
                        </button>
                        {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? 'bg-ilinyx-400' : 'bg-slate-200'}`} />}
                    </React.Fragment>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-7">
                    {step === 0 && <StepInfoGeneral acta={acta} set={set} setActa={onChange} setRow={setRow} addRow={addRow} delRow={delRow} setImportTarget={setImportTarget} />}
                    {step === 1 && <StepAgenda acta={acta} set={set} />}
                    {step === 2 && <StepResultados acta={acta} set={set} setRow={setRow} addRow={addRow} delRow={delRow} Sec={Sec} />}
                    {step === 3 && <StepFirmas acta={acta} user={user} delRow={delRow} addMySig={addMySig} onImportFirmas={() => setImportTarget('firmas_import')} Sec={Sec} />}
                </motion.div>
            </AnimatePresence>

            <div className="flex justify-between">
                <button disabled={step === 0} onClick={() => setStep(s => s - 1)}
                    className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-5 py-2.5 rounded-xl text-sm disabled:opacity-40 transition-all">
                    <ChevronLeft className="h-4 w-4" /> Anterior
                </button>
                {step < STEPS.length - 1
                    ? <button onClick={() => setStep(s => s + 1)} className="inline-flex items-center gap-2 bg-ilinyx-700 hover:bg-ilinyx-800 text-white font-semibold px-5 py-2.5 rounded-xl text-sm shadow-md transition-all">
                        Siguiente <ChevronRight className="h-4 w-4" />
                    </button>
                    : <button onClick={onPreview} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm shadow-md transition-all">
                        <Printer className="h-4 w-4" /> Vista Previa / Imprimir
                    </button>
                }
            </div>

            <CourseImportModal open={!!importTarget} onClose={() => setImportTarget(null)} onImport={handleCourseImport} />
        </div>
    );
}
