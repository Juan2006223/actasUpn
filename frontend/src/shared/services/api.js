import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';
const api = axios.create({ baseURL });

export const CLAVES_SESION = { acceso: 'access_token', renovacion: 'refresh_token', usuario: 'user_info' };

/** Avisa a la aplicación cuando la sesión ya no se puede renovar (la escucha AuthContext). */
export const eventosSesion = new EventTarget();
export const SESION_EXPIRADA = 'sesion-expirada';
/** Se emite en window justo antes de cerrar la sesión, para que el autoguardado deje salir sin preguntar. */
export const EVENTO_CIERRE_SESION = 'cerrando-sesion';

api.interceptors.request.use((config) => {
    const token = localStorage.getItem(CLAVES_SESION.acceso);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Si varias peticiones fallan a la vez, se renueva una sola vez.
let renovacionEnCurso = null;

function renovarSesion() {
    if (!renovacionEnCurso) {
        const refresh = localStorage.getItem(CLAVES_SESION.renovacion);
        renovacionEnCurso = (refresh
            ? axios.post(`${baseURL}/auth/refresh/`, { refresh }).then(({ data }) => {
                localStorage.setItem(CLAVES_SESION.acceso, data.access);
                if (data.refresh) localStorage.setItem(CLAVES_SESION.renovacion, data.refresh);
                return data.access;
            })
            : Promise.reject(new Error('Sin token de renovación'))
        ).finally(() => { renovacionEnCurso = null; });
    }
    return renovacionEnCurso;
}

const esRutaDeAcceso = (url = '') => /\/auth\/(login|refresh)\/?$/.test(url);

api.interceptors.response.use(
    (respuesta) => respuesta,
    async (error) => {
        const { config, response } = error;
        if (response?.status !== 401 || !config || config._reintentada || esRutaDeAcceso(config.url)) {
            throw error;
        }
        try {
            const token = await renovarSesion();
            config._reintentada = true;
            config.headers.Authorization = `Bearer ${token}`;
            return api(config);
        } catch {
            if (localStorage.getItem(CLAVES_SESION.acceso)) {
                eventosSesion.dispatchEvent(new Event(SESION_EXPIRADA));
            }
            error.sesionExpirada = true;
            throw error;
        }
    },
);

export default api;
