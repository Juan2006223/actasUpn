import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/aplicacion/AuthContext';
import * as authApi from './features/auth/infraestructura/api/authApi';
import ProtectedRoute from './features/auth/infraestructura/ui/ProtectedRoute';
import Login from './features/auth/infraestructura/ui/Login';
import Layout from './shared/components/Layout';
import ActasPage from './features/actas/infraestructura/ui/ActasPage';
import GruposPage from './features/grupos/infraestructura/ui/GruposPage';
import UsuariosPage from './features/usuarios/infraestructura/ui/UsuariosPage';

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider authService={authApi}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route element={<ProtectedRoute />}>
                        <Route element={<Layout />}>
                            <Route path="/" element={<Navigate to="/actas" replace />} />
                            <Route path="/actas" element={<ActasPage />} />
                            <Route path="/grupos" element={<GruposPage />} />
                            <Route path="/usuarios" element={<UsuariosPage />} />
                        </Route>
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}
