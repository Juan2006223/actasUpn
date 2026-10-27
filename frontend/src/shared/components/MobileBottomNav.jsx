import React from 'react';
import { IconDocumentActas, IconCommunityAcuerdos, IconUsers } from './ui/IconosMemorian';
import { ROLES_CREADORES_GRUPOS } from '../../features/auth/dominio/authModel';

export default function MobileBottomNav({ currentPath, rolUsuario, onNavigate }) {
    const items = [
        { path: '/actas', label: 'Actas', icono: <IconDocumentActas className="w-5 h-5" />, visible: true },
        { path: '/grupos', label: 'Grupos', icono: <IconCommunityAcuerdos className="w-5 h-5" />, visible: ROLES_CREADORES_GRUPOS.includes(rolUsuario) },
        { path: '/usuarios', label: 'Usuarios', icono: <IconUsers className="w-5 h-5" />, visible: rolUsuario === 'ADMIN' },
    ].filter((item) => item.visible);

    return (
        <div className="fixed bottom-5 left-0 right-0 z-40 px-4 flex justify-center pointer-events-none md:hidden no-print">
            <nav className="pointer-events-auto bg-[#0e131f] border border-slate-800 shadow-2xl rounded-full p-2 max-w-[260px] w-full flex items-center justify-around backdrop-blur-xl">
                {items.map((item) => {
                    const activo = currentPath.startsWith(item.path);
                    return (
                        <button
                            key={item.path}
                            onClick={() => onNavigate(item.path)}
                            className={`transition-all duration-300 cursor-pointer flex items-center justify-center ${
                                activo
                                    ? 'w-12 h-12 rounded-full bg-white text-[#0e131f] shadow-lg scale-105'
                                    : 'w-10 h-10 text-slate-400 hover:text-slate-200'
                            }`}
                            title={item.label}
                        >
                            {item.icono}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
