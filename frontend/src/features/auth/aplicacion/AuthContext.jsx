import React, { createContext, useContext, useState, useEffect } from 'react';
import { validarCredenciales } from '../dominio/authModel';

const AuthContext = createContext(null);

export function AuthProvider({ children, authService }) {
    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('user_info')) || null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token || !authService?.getMe) {
            setLoading(false);
            return;
        }
        authService.getMe()
            .then(res => {
                setUser(res.data);
                localStorage.setItem('user_info', JSON.stringify(res.data));
            })
            .catch(() => {
                setUser(null);
                localStorage.removeItem('access_token');
                localStorage.removeItem('user_info');
            })
            .finally(() => setLoading(false));
    }, [authService]);

    const login = async (username, password) => {
        const creds = validarCredenciales(username, password);
        const res = await authService.loginUser(creds.username, creds.password);
        localStorage.setItem('access_token', res.data.access);
        localStorage.setItem('user_info', JSON.stringify(res.data.user));
        setUser(res.data.user);
        return res.data.user;
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_info');
        setUser(null);
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
