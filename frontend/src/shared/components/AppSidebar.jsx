import React from 'react';
import { PanelLeftOpen, PanelLeftClose, LogOut } from 'lucide-react';
import {
    IconBrandMemorian,
    IconDocumentActas,
    IconCommunityAcuerdos,
    IconUsers,
} from './ui/IconosMemorian';
import { ROLES_CREADORES_GRUPOS } from '../../features/auth/dominio/authModel';

export default function AppSidebar({ expandido, currentPath, rolUsuario, onNavigate, onToggleExpandir, onCerrarSesion }) {
    const items = [
        {
            path: '/actas',
            label: 'ACTAS',
            subtitulo: 'Formato FOR023GDC',
            icono: <IconDocumentActas className="w-5 h-5" />,
            visible: true,
        },
        {
            path: '/grupos',
            label: 'GRUPOS',
            subtitulo: 'Comités y equipos',
            icono: <IconCommunityAcuerdos className="w-5 h-5" />,
            visible: ROLES_CREADORES_GRUPOS.includes(rolUsuario),
        },
        {
            path: '/usuarios',
            label: 'USUARIOS',
            subtitulo: 'Usuarios y roles',
            icono: <IconUsers className="w-5 h-5" />,
            visible: rolUsuario === 'ADMIN',
        },
    ].filter((item) => item.visible);

    const IconoPanel = expandido ? PanelLeftClose : PanelLeftOpen;
    const textoPanel = expandido ? 'Contraer menú' : 'Ampliar menú';

    return (
        <aside
            className={`hidden md:flex flex-col justify-between py-6 bg-white/90 backdrop-blur-md rounded-4xl border border-slate-100 shadow-soft shrink-0 h-[calc(100vh-3rem)] sticky top-6 transition-all duration-300 ease-in-out no-print ${
                expandido ? 'w-60 px-4' : 'w-20 px-2.5 items-center'
            }`}
        >
            <div className="flex flex-col gap-6">
                <div className={`flex items-center gap-3 select-none ${expandido ? 'px-2' : 'flex-col'}`}>
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center shadow-xs shrink-0">
                        <IconBrandMemorian className="w-7 h-7" />
                    </div>
                    {expandido && (
                        <div className="min-w-0 flex-1 transition-opacity duration-200">
                            <h2 className="text-xs font-black text-slate-900 tracking-tight leading-tight">
                                MEMORIAN
                            </h2>
                            <p className="text-[10px] font-semibold text-slate-400 truncate">
                                Gestión de Actas UPN
                            </p>
                        </div>
                    )}
                    {/* Único control para ampliar o contraer el menú: el ícono de panel lateral lo deja claro. */}
                    <button
                        type="button"
                        onClick={onToggleExpandir}
                        aria-expanded={expandido}
                        aria-label={textoPanel}
                        title={textoPanel}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-brand-blue hover:bg-blue-50 transition-all cursor-pointer shrink-0"
                    >
                        <IconoPanel className="w-5 h-5" />
                    </button>
                </div>

                <nav className="flex flex-col gap-2">
                    {items.map((item) => {
                        const activo = currentPath.startsWith(item.path);
                        return (
                            <button
                                key={item.path}
                                onClick={() => onNavigate(item.path)}
                                title={item.label}
                                aria-current={activo ? 'page' : undefined}
                                className={`flex items-center gap-3 rounded-2xl transition-all cursor-pointer ${
                                    expandido ? 'px-3 py-2.5 w-full' : 'w-11 h-11 justify-center'
                                } ${
                                    activo
                                        ? 'bg-brand-blue text-white shadow-md shadow-blue-500/25'
                                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <div className="shrink-0">{item.icono}</div>
                                {expandido && (
                                    <div className="text-left min-w-0 truncate">
                                        <p className="text-[11px] font-black tracking-wider leading-none">
                                            {item.label}
                                        </p>
                                        <p className={`text-[9px] font-medium truncate mt-0.5 ${activo ? 'text-blue-100' : 'text-slate-400'}`}>
                                            {item.subtitulo}
                                        </p>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {onCerrarSesion && (
                <button
                    type="button"
                    onClick={() => onCerrarSesion()}
                    aria-label="Cerrar sesión"
                    title="Cerrar sesión"
                    className={`flex items-center gap-3 rounded-2xl text-red-600 hover:bg-red-50 hover:text-red-700 transition-all cursor-pointer ${
                        expandido ? 'px-3 py-2.5 w-full' : 'w-11 h-11 justify-center'
                    }`}
                >
                    <LogOut className="w-5 h-5 shrink-0" />
                    {expandido && (
                        <span className="text-[11px] font-black tracking-wider uppercase">Cerrar sesión</span>
                    )}
                </button>
            )}
        </aside>
    );
}
