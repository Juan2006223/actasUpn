/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Users, Loader2 } from 'lucide-react';
import { getAgonCourses } from '../api/actasApi';
import { IconBrandMemorian } from '../../../../shared/components/ui/IconosMemorian';

export default function CourseImportModal({ open, onClose, onImport }) {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        getAgonCourses()
            .then(({ data }) => setCourses(Array.isArray(data) ? data : []))
            .catch(() => setCourses([]))
            .finally(() => setLoading(false));
    }, [open]);

    const filtered = courses.filter(c =>
        (c.name || '').toLowerCase().includes(filter.toLowerCase()) ||
        (c.code || '').toLowerCase().includes(filter.toLowerCase()) ||
        (c.teacher_name || '').toLowerCase().includes(filter.toLowerCase()) ||
        (c.features || '').toLowerCase().includes(filter.toLowerCase())
    );

    if (!open) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
            onMouseDown={e => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 flex flex-col max-h-[82vh] animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shadow-2xs shrink-0">
                            <IconBrandMemorian className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                GRUPOS DE ACTA · FOR023GDC
                            </span>
                            <h3 className="text-sm font-black text-slate-900 tracking-tight">
                                Importar Grupo e Integrantes al Acta
                            </h3>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer text-xs font-bold">✕</button>
                </div>

                <div className="mb-3">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            placeholder="Buscar grupo por nombre, creador o integrante..."
                            className="w-full pl-10 pr-3.5 py-2.5 text-xs font-bold text-slate-800 border border-slate-200 rounded-2xl bg-white shadow-2xs outline-none focus:border-brand-blue placeholder:font-medium placeholder:text-slate-400"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 text-brand-blue animate-spin" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 text-xs font-semibold">
                            {courses.length === 0 ? 'No hay grupos creados aún en Grupos de Acta' : 'No hay grupos que coincidan'}
                        </div>
                    ) : (
                        filtered.map(course => (
                            <button
                                key={course.id}
                                type="button"
                                onClick={() => { onImport(course); onClose(); }}
                                className="w-full text-left p-3.5 rounded-2xl border border-slate-200/80 hover:border-brand-blue hover:bg-blue-50/40 transition flex items-center justify-between gap-3 cursor-pointer"
                            >
                                <div className="min-w-0">
                                    <p className="font-black text-slate-900 text-xs truncate">{course.name}</p>
                                    <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
                                        {course.code} · Creado por {course.teacher_name}
                                    </p>
                                    {course.features && (
                                        <p className="text-[10px] font-bold text-brand-blue truncate mt-1">
                                            Integrantes: {course.features}
                                        </p>
                                    )}
                                </div>
                                <span className="inline-flex items-center gap-1 bg-blue-50 text-brand-blue border border-blue-100 text-[11px] font-black px-2.5 py-1 rounded-xl shrink-0">
                                    <Users className="h-3.5 w-3.5" /> {course.student_count}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
