import React from 'react';
import { Users } from 'lucide-react';
import PeopleTable from './PeopleTable';
import { StepResultados, StepFirmas } from './ActaFormSteps';
import { anioDelActa, cambiarFechaActa } from '../../dominio/actaModel';

const lbl = 'block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide';
const inp = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-ilinyx-400/20 focus:border-ilinyx-500 transition-all';
const emptyPerson = { nombre: '', cargo: '', email: '', user_id: null, foto: '' };
const emptyNA = { nombre: 'N/A', cargo: '', email: '', user_id: null, foto: '' };

export function Sec({ num, title, hint, action, children }) {
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-baseline gap-2">
                    {num && <span className="text-xs font-bold text-ilinyx-600 bg-ilinyx-50 px-2 py-0.5 rounded-full">{num}</span>}
                    <h3 className="font-bold text-slate-700">{title}</h3>
                    {hint && <span className="text-xs text-slate-400">({hint})</span>}
                </div>
                {action}
            </div>
            {children}
        </div>
    );
}

export function StepInfoGeneral({ acta, set, setActa, setRow, addRow, delRow, setImportTarget }) {
    return (
        <>
            <Sec title="Encabezado">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className={lbl}>Tipo de documento</label>
                        <div className="flex gap-4 mt-1.5">
                            {['ACTA', 'RESUMEN'].map(t => (
                                <label key={t} className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="tipo" value={t} checked={acta.tipo === t} onChange={() => set('tipo', t)} className="accent-ilinyx-600" />
                                    <span className="text-sm font-medium text-slate-700">{t}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div><label className={lbl}>No. del Acta</label><input value={acta.numero} onChange={e => set('numero', e.target.value)} className={inp} placeholder="001" /></div>
                    <div>
                        <label className={lbl}>Año</label>
                        <input value={anioDelActa(acta)} onChange={e => set('anio', e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" className={inp} placeholder={String(new Date().getFullYear())} />
                        <p className="text-[11px] text-slate-400 mt-1">Se toma de la fecha del acta; puedes cambiarlo.</p>
                    </div>
                </div>
            </Sec>
            <Sec
                num="1"
                title="Información General"
                action={
                    <button
                        type="button"
                        onClick={() => setImportTarget('grupo_completo')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                        <Users className="h-3.5 w-3.5" /> Cargar Grupo e Integrantes
                    </button>
                }
            >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div><label className={lbl}>Fecha *</label><input type="date" value={acta.fecha} onChange={e => setActa(a => cambiarFechaActa(a, e.target.value))} className={inp} /></div>
                    <div><label className={lbl}>Hora inicio</label><input type="time" value={acta.hora_inicio} onChange={e => set('hora_inicio', e.target.value)} className={inp} /></div>
                    <div><label className={lbl}>Hora final</label><input type="time" value={acta.hora_final} onChange={e => set('hora_final', e.target.value)} className={inp} /></div>
                </div>
                <div><label className={lbl}>Instancias / Dependencias</label><input value={acta.instancias} onChange={e => set('instancias', e.target.value)} className={inp} placeholder="Ej. Comité de Prácticas / Grupo de Acta" /></div>
                <div><label className={lbl}>Lugar de la reunión</label><input value={acta.lugar} onChange={e => set('lugar', e.target.value)} className={inp} /></div>
            </Sec>
            <Sec num="2" title="Asistentes" hint="Busca por nombre o cédula o importa un grupo">
                <PeopleTable rows={acta.asistentes} emptyRow={emptyPerson} onChange={(i, k, v) => setRow('asistentes', i, k, v)} onAdd={r => addRow('asistentes', r)} onDel={i => delRow('asistentes', i)} onImportCourse={() => setImportTarget('asistentes')} />
            </Sec>
            <Sec num="3" title="Ausentes" hint="N/A si no aplica">
                <PeopleTable rows={acta.ausentes} emptyRow={emptyNA} onChange={(i, k, v) => setRow('ausentes', i, k, v)} onAdd={r => addRow('ausentes', r)} onDel={i => delRow('ausentes', i)} onImportCourse={() => setImportTarget('ausentes')} />
            </Sec>
            <Sec num="4" title="Invitados" hint="N/A si no aplica">
                <PeopleTable rows={acta.invitados} emptyRow={emptyNA} onChange={(i, k, v) => setRow('invitados', i, k, v)} onAdd={r => addRow('invitados', r)} onDel={i => delRow('invitados', i)} onImportCourse={() => setImportTarget('invitados')} />
            </Sec>
        </>
    );
}

export function StepAgenda({ acta, set }) {
    return (
        <>
            <Sec num="5" title="Orden del Día">
                <textarea rows={5} value={acta.orden_dia} onChange={e => set('orden_dia', e.target.value)} className={inp} placeholder="Describa los puntos del orden del día..." />
            </Sec>
            <Sec num="6" title="Desarrollo del Orden del Día">
                <textarea rows={10} value={acta.desarrollo} onChange={e => set('desarrollo', e.target.value)} className={inp} placeholder="Describa el desarrollo de cada punto..." />
            </Sec>
        </>
    );
}

export { StepResultados, StepFirmas };
