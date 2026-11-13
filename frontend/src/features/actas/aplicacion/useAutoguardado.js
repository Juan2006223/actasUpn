import { useCallback, useEffect, useRef, useState } from 'react';
import {
    claveBorrador, esClaveBorradorDeUsuario, huellaActa,
    actaTieneContenido, prepararActaParaGuardar,
} from '../dominio/actaModel';
import { EVENTO_CIERRE_SESION } from '../../../shared/services/api';

// Copia en el navegador casi inmediata (cubre apagones y cierres de pestaña)
// y sincronización con el servidor un poco después (cubre cambio de equipo).
const ESPERA_LOCAL_MS = 500;
const ESPERA_SERVIDOR_MS = 3000;
const REINTENTO_MS = 15000;

export const almacenBorradores = {
    leer(clave) {
        try {
            const raw = localStorage.getItem(clave);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    },
    escribir(clave, valor) {
        try {
            localStorage.setItem(clave, JSON.stringify(valor));
            return true;
        } catch {
            return false;
        }
    },
    borrar(clave) {
        try { localStorage.removeItem(clave); } catch { /* sin almacenamiento disponible */ }
    },
    listar(userId) {
        const resultado = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const clave = localStorage.key(i);
                if (!esClaveBorradorDeUsuario(clave, userId)) continue;
                const valor = almacenBorradores.leer(clave);
                if (valor?.acta) resultado.push({ clave, ...valor });
            }
        } catch { /* sin almacenamiento disponible */ }
        return resultado;
    },
};

/**
 * Estados: 'sincronizado' | 'pendiente' | 'guardando' | 'sin_conexion'
 *
 * @param acta       acta que se está editando
 * @param base       versión que hay en el servidor al abrir el formulario (null si es nueva)
 * @param activo     true mientras el formulario está abierto
 * @param guardarEnServidor (acta) => Promise<actaGuardada>
 * @param onActaCreada      (actaGuardada) => void, para guardar el id que asignó el servidor
 */
export function useAutoguardado({ acta, base, activo, userId, guardarEnServidor, onActaCreada }) {
    const [estado, setEstado] = useState('sincronizado');
    const [ultimoGuardado, setUltimoGuardado] = useState(null);

    const actaRef = useRef(acta);
    actaRef.current = acta;
    const callbacksRef = useRef({ guardarEnServidor, onActaCreada });
    callbacksRef.current = { guardarEnServidor, onActaCreada };

    const huellaServidor = useRef(null);
    const idServidor = useRef(null);
    const enCurso = useRef(null);
    const repetir = useRef(false);
    const timerLocal = useRef(null);
    const timerServidor = useRef(null);

    const limpiarTimers = () => {
        clearTimeout(timerLocal.current);
        clearTimeout(timerServidor.current);
    };

    const guardarLocal = useCallback((actual) => {
        const id = actual?.id ?? idServidor.current;
        almacenBorradores.escribir(claveBorrador(userId, id), {
            acta: { ...actual, id: id ?? actual?.id },
            guardadoEn: new Date().toISOString(),
        });
    }, [userId]);

    const sincronizar = useCallback(async () => {
        clearTimeout(timerServidor.current);
        if (enCurso.current) {
            repetir.current = true;
            return enCurso.current;
        }
        const actual = { ...actaRef.current };
        if (!actual.id && idServidor.current) actual.id = idServidor.current;
        const huella = huellaActa(actual);
        if (huella === huellaServidor.current) return undefined;
        if (!actual.id && !actaTieneContenido(actual)) return undefined;

        setEstado('guardando');
        enCurso.current = (async () => {
            try {
                const guardada = await callbacksRef.current.guardarEnServidor(prepararActaParaGuardar(actual));
                const eraNueva = !actual.id && guardada?.id;
                if (eraNueva) {
                    idServidor.current = guardada.id;
                    huellaServidor.current = huellaActa({ ...actual, id: guardada.id });
                    almacenBorradores.borrar(claveBorrador(userId, null));
                    callbacksRef.current.onActaCreada?.(guardada);
                } else {
                    huellaServidor.current = huella;
                }
                setUltimoGuardado(new Date());

                const sigueIgual = huellaActa({ ...actaRef.current, id: actual.id ?? idServidor.current }) === huellaServidor.current;
                if (sigueIgual) {
                    almacenBorradores.borrar(claveBorrador(userId, actual.id ?? idServidor.current));
                    setEstado('sincronizado');
                } else {
                    setEstado('pendiente');
                }
            } catch (e) {
                if (e?.response?.status === 404) {
                    // El acta se eliminó (p. ej. desde otra pestaña): no tiene sentido seguir reintentando.
                    almacenBorradores.borrar(claveBorrador(userId, actual.id));
                    setEstado('eliminada');
                    return;
                }
                // La copia local sigue a salvo; se reintenta más tarde.
                setEstado('sin_conexion');
                timerServidor.current = setTimeout(() => { sincronizar(); }, REINTENTO_MS);
            } finally {
                enCurso.current = null;
                if (repetir.current) {
                    repetir.current = false;
                    sincronizar();
                }
            }
        })();
        return enCurso.current;
    }, [userId]);

    // Al abrir el formulario se toma como referencia lo que hay en el servidor.
    useEffect(() => {
        if (!activo) return undefined;
        huellaServidor.current = base ? huellaActa(base) : null;
        idServidor.current = base?.id ?? null;
        setEstado('sincronizado');
        setUltimoGuardado(null);
        return limpiarTimers;
    }, [activo]); // eslint-disable-line react-hooks/exhaustive-deps

    // Cada cambio: copia local rápida y sincronización diferida.
    useEffect(() => {
        if (!activo || !acta) return;
        const huella = huellaActa({ ...acta, id: acta.id ?? idServidor.current });
        if (huella === huellaServidor.current) return;
        if (!acta.id && !idServidor.current && !actaTieneContenido(acta)) return;

        setEstado((e) => (e === 'guardando' ? e : 'pendiente'));
        clearTimeout(timerLocal.current);
        timerLocal.current = setTimeout(() => guardarLocal(actaRef.current), ESPERA_LOCAL_MS);
        clearTimeout(timerServidor.current);
        timerServidor.current = setTimeout(() => { sincronizar(); }, ESPERA_SERVIDOR_MS);
    }, [acta, activo, guardarLocal, sincronizar]);

    // Al cerrar sesión no se pregunta "¿salir del sitio?": la copia local queda y se recupera al volver a entrar.
    const cerrandoSesion = useRef(false);
    useEffect(() => {
        const alCerrarSesion = () => { cerrandoSesion.current = true; };
        window.addEventListener(EVENTO_CIERRE_SESION, alCerrarSesion);
        return () => window.removeEventListener(EVENTO_CIERRE_SESION, alCerrarSesion);
    }, []);

    // Aviso del navegador si se intenta cerrar con cambios que aún no llegan al servidor.
    useEffect(() => {
        if (!activo || estado === 'sincronizado' || estado === 'eliminada') return undefined;
        const avisar = (e) => {
            guardarLocal(actaRef.current);
            if (cerrandoSesion.current) return;
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', avisar);
        return () => window.removeEventListener('beforeunload', avisar);
    }, [activo, estado, guardarLocal]);

    /** Guarda ya lo pendiente (p. ej. al salir del formulario). */
    const guardarAhora = useCallback(async () => {
        clearTimeout(timerLocal.current);
        if (actaRef.current && huellaActa(actaRef.current) !== huellaServidor.current) {
            guardarLocal(actaRef.current);
        }
        await sincronizar();
    }, [guardarLocal, sincronizar]);

    /** Espera lo que esté en curso y detiene el autoguardado antes de un guardado manual. Devuelve el id en el servidor. */
    const detener = useCallback(async () => {
        limpiarTimers();
        repetir.current = false;
        if (enCurso.current) await enCurso.current;
        limpiarTimers();
        return idServidor.current;
    }, []);

    /** Tras un guardado manual exitoso. */
    const marcarGuardado = useCallback((actaGuardada) => {
        const id = actaGuardada?.id ?? idServidor.current;
        almacenBorradores.borrar(claveBorrador(userId, null));
        if (id) almacenBorradores.borrar(claveBorrador(userId, id));
        huellaServidor.current = huellaActa(actaGuardada || actaRef.current);
        setEstado('sincronizado');
        setUltimoGuardado(new Date());
    }, [userId]);

    return { estado, ultimoGuardado, guardarAhora, detener, marcarGuardado };
}
