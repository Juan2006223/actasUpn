import React, { useEffect, useState } from 'react';
import {
    IconRoom,
    IconLayers,
    IconLocationPin,
    IconUsers,
    IconPencil,
    IconTrash,
    IconEye,
} from '../../../../shared/components/ui/IconosMemorian';
import {
    estadoVisible, accionDeEstado, sincronizarFirmasConParticipantes, miFirma,
} from '../../dominio/actaModel';
import EstadoActaBadge from './EstadoActaBadge';
import ObservacionesActa from './ObservacionesActa';

const TONOS = {
    emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    indigo: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    amber: 'bg-amber-500 hover:bg-amber-600 text-white',
    rose: 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200',
    slate: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200',
};

function AccionesDeEstado({ acta, userId, onCambiarEstado }) {
    const [pidiendo, setPidiendo] = useState(null);
    const [motivo, setMotivo] = useState('');
    const [enviando, setEnviando] = useState(false);
    useEffect(() => { setPidiendo(null); setMotivo(''); }, [acta.id, acta.estado]);

    const destinos = acta.permisos?.transiciones || [];
    if (!destinos.length || !onCambiarEstado) return null;
    const esCreador = String(acta.creador_id) === String(userId);

    const ejecutar = async (destino, texto = '') => {
        setEnviando(true);
        await onCambiarEstado(acta, destino, texto);
        setEnviando(false);
    };

    if (pidiendo) {
        const accion = accionDeEstado(acta, pidiendo, esCreador);
        return (
            <form className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                onSubmit={(e) => { e.preventDefault(); ejecutar(pidiendo, motivo); }}>
                <label htmlFor="motivo-estado" className="text-xs font-black text-slate-800 block">{accion.texto}</label>
                {accion.confirmar && <p className="text-[11px] font-semibold text-rose-700">{accion.confirmar}</p>}
                <textarea id="motivo-estado" value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} maxLength={2000}
                    placeholder="¿Qué hay que corregir? (queda como observación)"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setPidiendo(null)} className="px-3 py-1.5 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-200 cursor-pointer">Cancelar</button>
                    <button type="submit" disabled={enviando} className={`px-3 py-1.5 text-xs font-black rounded-xl cursor-pointer disabled:opacity-50 ${TONOS[accion.tono]}`}>
                        {enviando ? 'Enviando...' : 'Confirmar'}
                    </button>
                </div>
            </form>
        );
    }

    return (
        <div className="flex flex-wrap gap-2">
            {destinos.map((destino) => {
                const accion = accionDeEstado(acta, destino, esCreador);
                return (
                    <button key={destino} type="button" disabled={enviando}
                        onClick={() => (accion.pideMotivo ? setPidiendo(destino) : ejecutar(destino))}
                        className={`flex-1 min-w-[140px] py-2.5 rounded-2xl text-xs font-black shadow-sm transition cursor-pointer disabled:opacity-50 ${TONOS[accion.tono]}`}>
                        {accion.texto}
                    </button>
                );
            })}
        </div>
    );
}

function AyudaDeEstado({ acta, userId }) {
    const yo = miFirma(acta, userId);
    const esCreador = String(acta.creador_id) === String(userId);
    let texto = '';
    if (acta.estado === 'BORRADOR' && esCreador) {
        texto = 'Cuando esté lista, publícala para que todos firmen, o envíala a revisión si quieres que la revisen antes.';
    } else if (acta.estado === 'BORRADOR' && yo) {
        texto = 'Esta acta todavía está en borrador. Podrás firmarla cuando quien la redacta la publique.';
    } else if (acta.estado === 'EN_REVISION' && esCreador) {
        texto = 'Está esperando la revisión. Si el revisor no la revisa, puedes retirarla y publicarla directamente.';
    } else if (acta.estado === 'EN_REVISION' && acta.permisos?.revisar) {
        texto = 'Puedes corregirla con "Editar" y luego aprobarla, o devolverla con observaciones.';
    } else if (acta.estado === 'PARA_FIRMA' && acta.permisos?.transiciones?.includes('BORRADOR')) {
        texto = 'Para corregir el texto hay que reabrirla; eso anula las firmas registradas.';
    }
    return texto ? <p className="text-[11px] font-semibold text-slate-500">{texto}</p> : null;
}

export default function ActaCard({ acta, userId, onEdit, onDelete, onView, onSign, onComment, onCambiarEstado }) {
    if (!acta) {
        return (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 text-center text-slate-400 text-xs font-semibold">
                Selecciona un acta de la lista para ver su detalle completo.
            </div>
        );
    }

    // Las actas guardadas antes del arreglo pueden no tener a todas las personas en firmas.
    const firmas = sincronizarFirmasConParticipantes(acta);
    const totalFirmas = firmas.length;
    const firmasHechas = firmas.filter((f) => f.firmado).length;
    const permisos = acta.permisos || {};
    const estado = estadoVisible({ ...acta, firmas });

    return (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900">Detalle del acta</h3>
                <EstadoActaBadge estado={estado} />
            </div>

            <div className="flex items-start gap-4">
                <div style={{ backgroundColor: '#EC4899' }} className="w-12 h-12 rounded-2xl text-white flex items-center justify-center shrink-0 shadow-md">
                    <IconRoom className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                    <h4 className="text-base font-black text-slate-900 truncate">
                        {acta.numero ? `Acta No. ${acta.numero}` : `Acta #${acta.id}`}
                    </h4>
                    <p className="text-xs font-bold text-slate-400">
                        {acta.tipo || 'ACTA'} · Código FOR023GDC · {acta.instancias || 'UPN'}
                    </p>
                    {(acta.creador_nombre || acta.dependencia_nombre) && (
                        <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                            Redactada por {acta.creador_nombre || '—'}{acta.dependencia_nombre ? ` · ${acta.dependencia_nombre}` : ''}
                        </p>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <h5 className="text-xs font-black text-slate-900">Información</h5>
                <div className="bg-[#F8FAFC] border border-slate-100 rounded-2xl p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600 font-medium">
                        <span className="flex items-center gap-1.5 text-slate-400"><IconLayers className="w-3.5 h-3.5" /> Instancia / Grupo:</span>
                        <span className="font-extrabold text-slate-900">{acta.instancias || 'No especificada'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 font-medium">
                        <span className="flex items-center gap-1.5 text-slate-400"><IconLocationPin className="w-3.5 h-3.5" /> Lugar y Fecha:</span>
                        <span className="font-extrabold text-slate-900">{[acta.lugar, acta.fecha].filter(Boolean).join(' · ') || 'No especificado'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 font-medium">
                        <span className="flex items-center gap-1.5 text-slate-400"><IconUsers className="w-3.5 h-3.5" /> Firmas registradas:</span>
                        <span className="font-extrabold text-slate-900">{firmasHechas} de {totalFirmas} personas</span>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                    <h5 className="text-xs font-black text-slate-900">Participantes y firmas</h5>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black">{totalFirmas}</span>
                </div>
                {totalFirmas > 0 ? (
                    <ul className="flex flex-wrap gap-1.5">
                        {firmas.map((f, i) => (
                            <li key={`${f.user_id ?? f.nombre}-${i}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold">
                                <span>{f.nombre}</span>
                                <span className={`px-1.5 rounded-md text-[10px] font-black ${f.firmado ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'}`}>
                                    {f.firmado ? '✓ Firmó' : 'Pendiente'}
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="p-3 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-xs font-medium">
                        Sin participantes. Agrégalos en "Asistentes" al editar el acta.
                    </div>
                )}
            </div>

            {permisos.firmar && (
                <button type="button" onClick={() => onSign(acta.id)}
                    className="w-full py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-md transition cursor-pointer">
                    Firmar acta ahora
                </button>
            )}

            <div className="space-y-2">
                <AyudaDeEstado acta={acta} userId={userId} />
                <AccionesDeEstado acta={acta} userId={userId} onCambiarEstado={onCambiarEstado} />
            </div>

            <ObservacionesActa observaciones={acta.comentarios} puedeComentar={permisos.comentar !== false && !!onComment}
                onEnviar={(texto) => onComment(acta.id, texto)} />

            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => onView(acta)}
                    className="flex-1 py-2.5 rounded-2xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-black shadow-md cursor-pointer transition flex items-center justify-center gap-2">
                    <IconEye className="w-4 h-4 text-emerald-400" /> Ver / PDF Oficial
                </button>
                {permisos.editar && onEdit && (
                    <button type="button" onClick={() => onEdit(acta)}
                        className="px-3.5 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer flex items-center gap-1.5 transition">
                        <IconPencil className="w-3.5 h-3.5" /> Editar
                    </button>
                )}
                {permisos.eliminar && onDelete && (
                    <button type="button" onClick={() => onDelete(acta.id)} aria-label="Eliminar acta" title="Eliminar acta"
                        className="px-3 py-2.5 rounded-2xl bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-600 hover:text-white cursor-pointer flex items-center gap-1 transition">
                        <IconTrash className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
}
