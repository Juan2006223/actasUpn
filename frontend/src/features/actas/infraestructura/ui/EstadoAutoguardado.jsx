import React from 'react';
import { CheckCircle2, Loader2, CloudOff, PencilLine } from 'lucide-react';

const hora = (d) => d?.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

export default function EstadoAutoguardado({ estado, ultimoGuardado }) {
    const vistas = {
        sincronizado: {
            icono: <CheckCircle2 className="h-3.5 w-3.5" />,
            texto: ultimoGuardado ? `Guardado automáticamente · ${hora(ultimoGuardado)}` : 'Sin cambios pendientes',
            clase: 'text-emerald-700 bg-emerald-50 border-emerald-100',
        },
        pendiente: {
            icono: <PencilLine className="h-3.5 w-3.5" />,
            texto: 'Cambios guardados en este equipo…',
            clase: 'text-slate-600 bg-slate-50 border-slate-200',
        },
        guardando: {
            icono: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
            texto: 'Guardando en el servidor…',
            clase: 'text-slate-600 bg-slate-50 border-slate-200',
        },
        sin_conexion: {
            icono: <CloudOff className="h-3.5 w-3.5" />,
            texto: 'Sin conexión: guardado en este equipo, se reintentará',
            clase: 'text-amber-700 bg-amber-50 border-amber-200',
        },
        eliminada: {
            icono: <CloudOff className="h-3.5 w-3.5" />,
            texto: 'Esta acta fue eliminada: los cambios ya no se guardan',
            clase: 'text-red-700 bg-red-50 border-red-200',
        },
    };
    const v = vistas[estado] || vistas.sincronizado;
    return (
        <span role="status" aria-live="polite" className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${v.clase}`}>
            {v.icono} {v.texto}
        </span>
    );
}
