import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/aplicacion/AuthContext';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
import MobileBottomNav from './MobileBottomNav';

const SECCION_NOMBRES = {
    '/actas': 'Actas de Reunión (FOR023GDC)',
    '/grupos': 'Gestión de Grupos',
    '/usuarios': 'Gestión de Usuarios y Roles',
};

export default function Layout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarExpandido, setSidebarExpandido] = useState(false);

    const seccionActivaNombre = SECCION_NOMBRES[location.pathname] || 'Actas de Reunión (FOR023GDC)';
    const esVistaModular = location.pathname.startsWith('/usuarios') || location.pathname.startsWith('/grupos');

    return (
        <div className="min-h-screen transition-all bg-canvas p-3 sm:p-5 lg:p-6 pb-20 md:pb-6 flex gap-4 lg:gap-6 max-w-[1780px] mx-auto">
            <AppSidebar
                expandido={sidebarExpandido}
                currentPath={location.pathname}
                rolUsuario={user?.role}
                onNavigate={(path) => navigate(path)}
                onToggleExpandir={() => setSidebarExpandido((v) => !v)}
                onCerrarSesion={() => logout()}
            />

            <main className="flex-1 space-y-5 min-w-0 transition-all duration-300">
                <AppHeader
                    seccionActivaNombre={seccionActivaNombre}
                    usuario={user}
                />

                {esVistaModular ? (
                    <Outlet />
                ) : (
                    <div className="bg-white rounded-4xl border border-slate-100 shadow-soft p-6 sm:p-8">
                        <Outlet />
                    </div>
                )}
            </main>

            <MobileBottomNav
                currentPath={location.pathname}
                rolUsuario={user?.role}
                onNavigate={(path) => navigate(path)}
                onCerrarSesion={() => logout()}
            />
        </div>
    );
}
