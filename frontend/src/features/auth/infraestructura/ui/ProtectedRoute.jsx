import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../aplicacion/AuthContext';

export default function ProtectedRoute() {
    const { isAuthenticated, loading } = useAuth();
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8] text-slate-500 text-sm font-medium">
                Cargando sesión...
            </div>
        );
    }
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
