import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { validarCredenciales, estadoInactividad, segundosRestantes } from '../dominio/authModel';
import { CLAVES_SESION, eventosSesion, SESION_EXPIRADA, EVENTO_CIERRE_SESION } from '../../../shared/services/api';
import AvisoSesion from '../infraestructura/ui/AvisoSesion';

const AuthContext = createContext(null);

const CLAVE_ACTIVIDAD = 'ultima_actividad'; // compartida entre pestañas
export const CLAVE_MOTIVO_SALIDA = 'motivo_salida';
const EVENTOS_ACTIVIDAD = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'mousemove'];
const REGISTRO_CADA_MS = 15_000;
const REVISION_CADA_MS = 5_000;

const leer = (clave) => { try { return localStorage.getItem(clave); } catch { return null; } };
const escribir = (clave, valor) => { try { localStorage.setItem(clave, valor); } catch { /* sin almacenamiento */ } };
const borrar = (clave) => { try { localStorage.removeItem(clave); } catch { /* sin almacenamiento */ } };
const marcarActividad = () => escribir(CLAVE_ACTIVIDAD, String(Date.now()));

function limpiarSesion() {
    Object.values(CLAVES_SESION).forEach(borrar);
    borrar(CLAVE_ACTIVIDAD);
}

export function AuthProvider({ children, authService }) {
    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(leer(CLAVES_SESION.usuario)) || null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(true);
    const [aviso, setAviso] = useState(null); // null | { tipo: 'inactividad', segundos } | { tipo: 'expirada' }

    /** Cierra la sesión. El motivo se muestra en la pantalla de inicio. Las actas en edición ya están guardadas. */
    const logout = useCallback((motivo) => {
        window.dispatchEvent(new Event(EVENTO_CIERRE_SESION));
        limpiarSesion();
        if (typeof motivo === 'string') {
            try { sessionStorage.setItem(CLAVE_MOTIVO_SALIDA, motivo); } catch { /* sin almacenamiento */ }
        }
        setUser(null);
        window.location.href = '/login';
    }, []);

    useEffect(() => {
        const token = leer(CLAVES_SESION.acceso);
        if (!token || !authService?.getMe) {
            setLoading(false);
            return;
        }
        // Si se volvió después de 3 horas (p. ej. el equipo estuvo apagado), no se reabre la sesión.
        if (estadoInactividad(leer(CLAVE_ACTIVIDAD), Date.now()) === 'vencida') {
            logout('inactividad');
            return;
        }
        authService.getMe()
            .then(res => {
                setUser(res.data);
                escribir(CLAVES_SESION.usuario, JSON.stringify(res.data));
            })
            .catch((e) => {
                if (e?.sesionExpirada) {
                    logout('expirada');
                    return;
                }
                setUser(null);
                limpiarSesion();
            })
            .finally(() => setLoading(false));
    }, [authService, logout]);

    // Sesión que ya no se puede renovar: se avisa en una ventana en lugar de dejar seguir trabajando.
    useEffect(() => {
        const alExpirar = () => setAviso({ tipo: 'expirada' });
        eventosSesion.addEventListener(SESION_EXPIRADA, alExpirar);
        return () => eventosSesion.removeEventListener(SESION_EXPIRADA, alExpirar);
    }, []);

    // Inactividad: cualquier uso del aplicativo (en cualquier pestaña) reinicia la cuenta de 3 horas.
    useEffect(() => {
        if (!user) return undefined;
        if (!leer(CLAVE_ACTIVIDAD)) marcarActividad();
        let ultimoRegistro = 0;
        const alUsar = () => {
            const ahora = Date.now();
            if (ahora - ultimoRegistro < REGISTRO_CADA_MS) return;
            ultimoRegistro = ahora;
            marcarActividad();
        };
        EVENTOS_ACTIVIDAD.forEach((e) => window.addEventListener(e, alUsar, { passive: true }));
        const revisar = setInterval(() => {
            const ultima = leer(CLAVE_ACTIVIDAD);
            if (!leer(CLAVES_SESION.acceso)) return; // otra pestaña ya cerró la sesión
            const estado = estadoInactividad(ultima, Date.now());
            if (estado === 'vencida') {
                logout('inactividad');
            } else if (estado === 'aviso') {
                setAviso((a) => (a?.tipo === 'expirada' ? a : { tipo: 'inactividad', segundos: segundosRestantes(ultima, Date.now()) }));
            } else {
                setAviso((a) => (a?.tipo === 'inactividad' ? null : a));
            }
        }, REVISION_CADA_MS);
        return () => {
            EVENTOS_ACTIVIDAD.forEach((e) => window.removeEventListener(e, alUsar));
            clearInterval(revisar);
        };
    }, [user, logout]);

    const login = async (username, password) => {
        const creds = validarCredenciales(username, password);
        const res = await authService.loginUser(creds.username, creds.password);
        escribir(CLAVES_SESION.acceso, res.data.access);
        if (res.data.refresh) escribir(CLAVES_SESION.renovacion, res.data.refresh);
        escribir(CLAVES_SESION.usuario, JSON.stringify(res.data.user));
        marcarActividad();
        try { sessionStorage.removeItem(CLAVE_MOTIVO_SALIDA); } catch { /* sin almacenamiento */ }
        setAviso(null);
        setUser(res.data.user);
        return res.data.user;
    };

    const seguirConectado = () => {
        marcarActividad();
        setAviso(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
            {children}
            {user && aviso && (
                <AvisoSesion
                    tipo={aviso.tipo}
                    segundos={aviso.segundos}
                    onSeguir={seguirConectado}
                    onSalir={() => logout(aviso.tipo === 'expirada' ? 'expirada' : undefined)}
                />
            )}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
