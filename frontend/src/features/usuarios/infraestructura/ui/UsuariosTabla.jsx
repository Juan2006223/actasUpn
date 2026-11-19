import React from 'react';
import { obtenerConfigRol } from '../../dominio/usuarioModel';
import {
    IconShieldCheck,
    IconUserMinus,
    IconUserCheck,
} from '../../../../shared/components/ui/IconosMemorian';

export default function UsuariosTabla({
    usuarios,
    usuarioSesionId,
    procesandoId,
    onEditarRol,
    onToggleEstado,
    seleccionados = [],
    onToggleSeleccion,
}) {
    if (!usuarios || usuarios.length === 0) {
        return (
            <div className="py-12 text-center bg-white rounded-3xl border border-slate-100 p-6 shadow-2xs">
                <p className="text-xs font-bold text-slate-500">
                    No se encontraron usuarios del sistema.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            <th className="py-3.5 px-3 w-10" aria-label="Seleccionar usuario" />
                            <th className="py-3.5 px-4">Usuario</th>
                            <th className="py-3.5 px-4">Correo Institucional</th>
                            <th className="py-3.5 px-4">Cargo / Dependencia</th>
                            <th className="py-3.5 px-4">Rol en la plataforma</th>
                            <th className="py-3.5 px-4">Estado Acceso</th>
                            <th className="py-3.5 px-4 text-right">Acciones de Seguridad</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                        {usuarios.map((u) => {
                            const cfg = obtenerConfigRol(u.role);
                            const esMismoUsuario = Number(u.id) === Number(usuarioSesionId);
                            const bloqueado = procesandoId === u.id;
                            const nombreCompleto = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.full_name || u.username;
                            const inicial = nombreCompleto.charAt(0).toUpperCase();
                            const activo = u.is_active !== false;

                            return (
                                <tr key={u.id} className="hover:bg-slate-50/60 transition">
                                    <td className="py-3.5 px-3">
                                        {!esMismoUsuario && (
                                            <input
                                                type="checkbox"
                                                aria-label={`Seleccionar ${nombreCompleto}`}
                                                checked={seleccionados.includes(u.id)}
                                                onChange={() => onToggleSeleccion?.(u.id)}
                                                className="h-4 w-4 accent-blue-600 cursor-pointer"
                                            />
                                        )}
                                    </td>

                                    <td className="py-3.5 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="relative w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs border border-slate-200 shrink-0 overflow-hidden">
                                                {inicial}
                                                {u.photo && (
                                                    <img
                                                        src={u.photo}
                                                        alt=""
                                                        className="absolute inset-0 w-full h-full object-cover"
                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 leading-tight">
                                                    {nombreCompleto}
                                                </p>
                                                <span className="text-[9px] text-slate-400 font-medium block">
                                                    {u.username}
                                                </span>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                                        {u.email || 'Sin correo registrado'}
                                    </td>

                                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                                        {u.cargo || <span className="text-amber-600">Sin cargo</span>}
                                        <span className="block text-[10px] text-slate-400">
                                            {u.dependencia_nombre || 'Sin dependencia'}
                                        </span>
                                    </td>

                                    <td className="py-3.5 px-4">
                                        <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border shadow-2xs ${cfg.badge}`}>
                                            {cfg.label}
                                        </span>
                                    </td>

                                    <td className="py-3.5 px-4">
                                        <span
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                                                activo
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                                    : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                            }`}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full ${activo ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                            {activo ? 'Cuenta Activa' : 'Cuenta Inactiva'}
                                        </span>
                                    </td>

                                    <td className="py-3.5 px-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                type="button"
                                                disabled={bloqueado}
                                                onClick={() => onEditarRol(u)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-brand-blue bg-blue-50/70 hover:bg-brand-blue hover:text-white disabled:opacity-40 rounded-xl transition cursor-pointer"
                                                title="Cambiar rol, cargo y dependencia"
                                            >
                                                <IconShieldCheck className="w-3.5 h-3.5" />
                                                <span>Editar</span>
                                            </button>

                                            <button
                                                type="button"
                                                disabled={bloqueado || esMismoUsuario}
                                                onClick={() => onToggleEstado(u.id)}
                                                title={esMismoUsuario ? 'No puedes desactivar tu propia cuenta' : activo ? 'Desactivar acceso al sistema' : 'Activar acceso al sistema'}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-40 ${
                                                    activo
                                                        ? 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white'
                                                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'
                                                }`}
                                            >
                                                {activo ? (
                                                    <>
                                                        <IconUserMinus className="w-3.5 h-3.5" />
                                                        <span>Desactivar</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <IconUserCheck className="w-3.5 h-3.5" />
                                                        <span>Activar</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
