import { useCallback, useEffect, useRef, useState } from 'react';
import {
    enProceso, siguienteParte, extensionPermitida, contextoDesdeActa, planDeReanudacion,
} from '../dominio/grabacionModel';

const INTERVALO_CONSULTA_MS = 4000;
const REINTENTOS_POR_TROZO = 5;

const mensajeError = (e, porDefecto) => e?.response?.data?.detail || porDefecto;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Maneja la grabación ligada al acta (acta.grabacion_id). Una reunión puede llegar en varias partes
 * (varios audios o varias transcripciones). La subida va por trozos y se puede reanudar.
 */
export function useGrabacion({ grabacionId, onVincular, servicio }) {
    const [config, setConfig] = useState(null);
    const [grabacion, setGrabacion] = useState(null);
    const [subida, setSubida] = useState(null); // { enviados, total, parte, partes }
    const [error, setError] = useState('');
    const cancelada = useRef(false);

    useEffect(() => {
        servicio.getConfig().then((r) => setConfig(r.data))
            .catch(() => setConfig({ parte_mb: 8, max_mb: 2048, max_partes: 20, extensiones: [] }));
    }, [servicio]);

    const consultar = useCallback(async (ligero = false) => {
        if (!grabacionId) return null;
        try {
            const { data } = await servicio.consultarGrabacion(grabacionId, ligero);
            setGrabacion((prev) => (ligero && prev ? { ...prev, ...data } : data));
            return data;
        } catch (e) {
            if (e?.response?.status === 404) {
                setGrabacion(null);
                onVincular(null);
            }
            return null;
        }
    }, [grabacionId, servicio, onVincular]);

    useEffect(() => {
        setGrabacion(null);
        if (grabacionId) consultar();
    }, [grabacionId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Consulta periódica mientras se procesa; al terminar se trae el resultado completo.
    const estado = grabacion?.estado;
    useEffect(() => {
        if (!grabacionId || !enProceso(estado)) return undefined;
        const t = setInterval(async () => {
            const d = await consultar(true);
            if (d && !enProceso(d.estado)) consultar(false);
        }, INTERVALO_CONSULTA_MS);
        return () => clearInterval(t);
    }, [grabacionId, estado, consultar]);

    const enviarArchivos = async (id, archivos, desdePorParte) => {
        const tamanoTrozo = (config?.parte_mb || 8) * 1024 * 1024;
        const total = archivos.reduce((s, a) => s + a.size, 0);
        let yaEnviado = desdePorParte.reduce((s, d) => s + d, 0);
        cancelada.current = false;

        for (let i = 0; i < archivos.length && !cancelada.current; i++) {
            const archivo = archivos[i];
            let recibido = desdePorParte[i];
            const previoParte = yaEnviado - recibido; // bytes de partes anteriores
            setSubida({ enviados: yaEnviado, total, parte: i, partes: archivos.length });
            while (!cancelada.current) {
                const trozo = siguienteParte(archivo.size, recibido, tamanoTrozo);
                if (!trozo) break;
                for (let intento = 1; ; intento++) {
                    try {
                        const { data } = await servicio.subirParte(
                            id, i, trozo.inicio, archivo.slice(trozo.inicio, trozo.fin),
                            (ev) => setSubida({ enviados: previoParte + trozo.inicio + (ev.loaded || 0), total, parte: i, partes: archivos.length }),
                        );
                        recibido = data.partes?.[i]?.recibido ?? trozo.fin;
                        setGrabacion((prev) => ({ ...(prev || {}), ...data }));
                        break;
                    } catch (e) {
                        if ((e?.response?.status && e.response.status < 500) || intento >= REINTENTOS_POR_TROZO) throw e;
                        await esperar(2000 * intento); // conexión inestable: se reintenta el mismo trozo
                    }
                }
                yaEnviado = previoParte + recibido;
                setSubida({ enviados: yaEnviado, total, parte: i, partes: archivos.length });
            }
        }
        setSubida(null);
        if (!cancelada.current) await consultar();
    };

    /** Sube uno o varios audios (en el orden dado), o continúa una subida que quedó a medias. */
    const subirArchivos = async (archivos, acta, numHablantes) => {
        setError('');
        const extensiones = config?.extensiones || [];
        const invalido = archivos.find((a) => extensiones.length && !extensionPermitida(a.name, extensiones));
        if (invalido) {
            setError(`"${invalido.name}" no tiene un formato soportado. Usa audio o video (mp3, m4a, wav, ogg, webm, mp4…).`);
            return;
        }
        const total = archivos.reduce((s, a) => s + a.size, 0);
        if (config?.max_mb && total > config.max_mb * 1024 * 1024) {
            setError(`Los archivos superan el máximo permitido (${config.max_mb} MB en total).`);
            return;
        }
        try {
            const reanudar = grabacion?.estado === 'SUBIENDO' ? planDeReanudacion(grabacion.partes, archivos) : null;
            let id = grabacion?.id;
            if (!reanudar) {
                if (grabacion?.id) await servicio.eliminarGrabacion(grabacion.id).catch(() => {});
                const { data } = await servicio.crearGrabacion({
                    archivos: archivos.map((a) => ({ nombre_archivo: a.name, tamano_bytes: a.size })),
                    num_hablantes: numHablantes || null,
                    contexto: contextoDesdeActa(acta),
                });
                id = data.id;
                setGrabacion(data);
                onVincular(id);
            }
            await enviarArchivos(id, archivos, reanudar || archivos.map(() => 0));
        } catch (e) {
            setSubida(null);
            setError(mensajeError(e, 'Se interrumpió la subida. Vuelve a seleccionar los mismos archivos para continuar donde quedó.'));
        }
    };

    /** Una o varias transcripciones pegadas, en orden. */
    const procesarTextos = async (textos, acta) => {
        setError('');
        try {
            const { data } = await servicio.crearGrabacion({ textos, contexto: contextoDesdeActa(acta) });
            setGrabacion(data);
            onVincular(data.id);
        } catch (e) {
            setError(mensajeError(e, 'No se pudo enviar la transcripción.'));
        }
    };

    const redactarDeNuevo = async (nombresHablantes, acta) => {
        setError('');
        try {
            const { data } = await servicio.volverARedactar(grabacionId, {
                nombres_hablantes: nombresHablantes, contexto: contextoDesdeActa(acta),
            });
            setGrabacion((prev) => ({ ...(prev || {}), ...data }));
        } catch (e) {
            setError(mensajeError(e, 'No se pudo volver a redactar.'));
        }
    };

    /** Quita la grabación del acta. Si se está procesando, el servidor lo detiene y borra todo. */
    const descartar = async () => {
        cancelada.current = true;
        setSubida(null);
        setError('');
        if (grabacionId) {
            try { await servicio.eliminarGrabacion(grabacionId); } catch { /* ya no existe */ }
        }
        setGrabacion(null);
        onVincular(null);
    };

    return { config, grabacion, subida, error, subirArchivos, procesarTextos, redactarDeNuevo, descartar };
}
