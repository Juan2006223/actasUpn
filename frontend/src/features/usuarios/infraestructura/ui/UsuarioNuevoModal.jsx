import React, { useState } from 'react';
import { IconBrandMemorian, IconIdCard, IconMail } from '../../../../shared/components/ui/IconosMemorian';

export default function UsuarioNuevoModal({ abierto, onCerrar, onCrearUsuario }) {
    const [cedula, setCedula] = useState('');
    const [email, setEmail] = useState('');
    const [nombres, setNombres] = useState('');
    const [apellidos, setApellidos] = useState('');
    const [rol, setRol] = useState('TEACHER');
    const [cargando, setCargando] = useState(false);
    const [mensaje, setMensaje] = useState(null);

    if (!abierto) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setCargando(true);
        setMensaje(null);
        const resp = await onCrearUsuario({
            document_number: cedula.trim(),
            email: email.trim(),
            first_name: nombres.trim(),
            last_name: apellidos.trim(),
            role: rol,
        });
        setCargando(false);
        if (resp.ok) {
            setMensaje({
                tipo: 'ok',
                texto: `Usuario autorizado exitosamente. Clave de primer acceso: ${cedula.trim()}`,
            });
            setCedula('');
            setEmail('');
            setNombres('');
            setApellidos('');
        } else {
            setMensaje({ tipo: 'error', texto: resp.error });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
            <div className="bg-white rounded-4xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-2xs">
                            <IconBrandMemorian className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                ADMINISTRACIÓN DE ACCESOS
                            </span>
                            <h3 className="text-sm font-black text-slate-900 tracking-tight">
                                Pre-autorizar Usuario en Directorio
                            </h3>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onCerrar}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer text-xs font-bold"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
                    {mensaje && (
                        <div
                            className={`p-3 text-xs font-semibold rounded-2xl border ${
                                mensaje.tipo === 'ok'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                                    : 'bg-rose-50 text-rose-700 border-rose-200/80'
                            }`}
                        >
                            {mensaje.texto}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-3.5 bg-slate-50/60 p-4 sm:p-5 rounded-3xl border border-slate-200/60">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-[11px] font-bold text-slate-700 block mb-1">Nombres</label>
                                <input
                                    type="text"
                                    value={nombres}
                                    onChange={(e) => setNombres(e.target.value)}
                                    placeholder="Ej. Ana Lucía"
                                    className="w-full px-3.5 py-2.5 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-slate-700 block mb-1">Apellidos</label>
                                <input
                                    type="text"
                                    value={apellidos}
                                    onChange={(e) => setApellidos(e.target.value)}
                                    placeholder="Ej. García Restrepo"
                                    className="w-full px-3.5 py-2.5 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">Número de Cédula *</label>
                            <div className="relative flex items-center">
                                <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                                    <IconIdCard className="w-4 h-4" />
                                </span>
                                <input
                                    type="text"
                                    required
                                    value={cedula}
                                    onChange={(e) => setCedula(e.target.value)}
                                    placeholder="Ej. 1020304050"
                                    className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">Correo Institucional *</label>
                            <div className="relative flex items-center">
                                <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                                    <IconMail className="w-4 h-4" />
                                </span>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="docente@upn.edu.co"
                                    className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">Perfil Institucional</label>
                            <select
                                value={rol}
                                onChange={(e) => setRol(e.target.value)}
                                className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-brand-blue outline-none"
                            >
                                <option value="TEACHER">Docente / Asesor Institucional</option>
                                <option value="SUPERVISOR">Supervisor Institucional / de Procesos</option>
                                <option value="COORDINADOR">Coordinador Académico / Administrativo</option>
                                <option value="APOYO">Profesional de Apoyo a la Gestión</option>
                                <option value="ASISTENTE">Asistente Administrativo / Secretaría de Actas</option>
                                <option value="ADMIN">Administrador del Sistema</option>
                                <option value="STUDENT">Estudiante / Participante de Sesión</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={cargando}
                            className="w-full py-3 px-4 text-xs font-bold text-white bg-brand-blue hover:bg-blue-600 active:scale-[0.99] disabled:opacity-50 rounded-xl transition shadow-md shadow-blue-500/20 cursor-pointer mt-1"
                        >
                            {cargando ? 'Registrando autorización...' : 'Autorizar y Habilitar Acceso Institucional'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
