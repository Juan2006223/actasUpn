import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    calcularPendientesPorFirmar, calcularPorRevisar, extraerAniosDisponibles, prepararActaParaGuardar
} from '../dominio/actaModel';

const detalle = (err, porDefecto) => err?.response?.data?.detail || porDefecto;

export function useActas(user, addToast, actasService) {
    const [actas, setActas] = useState([]);
    const [misActas, setMisActas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [firmaPersonal, setFirmaPersonal] = useState(null);

    const loadActas = useCallback(async () => {
        if (!actasService) return;
        setLoading(true);
        try {
            const [todasRes, misRes, firmaRes] = await Promise.all([
                actasService.getActas().catch(() => ({ data: [] })),
                actasService.getMisActas().catch(() => ({ data: [] })),
                actasService.getMiFirma().catch(() => ({ data: { firma_data: null } })),
            ]);
            setActas(todasRes.data || []);
            setMisActas(misRes.data || []);
            setFirmaPersonal(firmaRes.data?.firma_data || null);
        } catch {
            addToast?.('Error al cargar actas', 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast, actasService]);

    useEffect(() => {
        if (user) loadActas();
    }, [user, loadActas]);

    const saveActa = async (acta) => {
        try {
            const datos = prepararActaParaGuardar(acta);
            let res;
            if (acta.id && !acta.isNew) {
                res = await actasService.updateActa(acta.id, datos);
                addToast?.('Acta guardada', 'success');
            } else {
                res = await actasService.createActa(datos);
                addToast?.('Acta guardada como borrador', 'success');
            }
            await loadActas();
            return res?.data || true;
        } catch (err) {
            addToast?.(detalle(err, 'Error al guardar el acta'), 'error');
            return false;
        }
    };

    // Guardado silencioso usado por el autoguardado: sin avisos ni recarga de la lista.
    const autoguardarActa = useCallback(async (acta) => {
        const res = acta.id
            ? await actasService.updateActa(acta.id, acta)
            : await actasService.createActa({ ...acta, borrador: true });
        return res.data;
    }, [actasService]);

    const deleteActa = async (id) => {
        try {
            await actasService.deleteActa(id);
            addToast?.('Acta eliminada', 'success');
            await loadActas();
            return true;
        } catch (err) {
            addToast?.(detalle(err, 'Error al eliminar el acta'), 'error');
            return false;
        }
    };

    // Firmar, observar y cambiar estado tienen su propio endpoint: el servidor valida el permiso
    // y devuelve el acta actualizada, que reemplaza a la que hay en las listas.
    const reemplazarEnListas = useCallback((actualizada) => {
        const cambiar = (lista) => lista.map((a) => (a.id === actualizada.id ? actualizada : a));
        setActas(cambiar);
        setMisActas(cambiar);
    }, []);

    const accionSobreActa = async (llamada, exito, error) => {
        try {
            const res = await llamada();
            reemplazarEnListas(res.data);
            if (exito) addToast?.(exito, 'success');
            return res.data;
        } catch (err) {
            addToast?.(detalle(err, error), 'error');
            return null;
        }
    };

    const firmarActa = (actaId, firmaData) => accionSobreActa(
        () => actasService.firmarActa(actaId, firmaData), 'Acta firmada', 'No se pudo firmar el acta');

    const guardarFirmaPersonal = async (firmaData) => {
        try {
            await actasService.saveMiFirma(firmaData);
            setFirmaPersonal(firmaData);
            addToast?.('Firma personal guardada', 'success');
            return true;
        } catch {
            addToast?.('Error al guardar firma personal', 'error');
            return false;
        }
    };

    const comentar = (actaId, texto) => accionSobreActa(
        () => actasService.agregarObservacion(actaId, texto), 'Observación enviada', 'No se pudo enviar la observación');

    const cambiarEstado = (actaId, estado, motivo, mensaje) => accionSobreActa(
        () => actasService.cambiarEstadoActa(actaId, estado, motivo), mensaje, 'No se pudo cambiar el estado del acta');

    const pendingCount = useMemo(() => calcularPendientesPorFirmar(actas), [actas]);
    const porRevisarCount = useMemo(() => calcularPorRevisar(actas), [actas]);
    const availableYears = useMemo(() => extraerAniosDisponibles(actas, misActas), [actas, misActas]);

    return {
        actas, misActas, loading,
        firmaPersonal, setFirmaPersonal,
        loadActas, saveActa, autoguardarActa, deleteActa,
        firmarActa, guardarFirmaPersonal, comentar, cambiarEstado,
        pendingCount, porRevisarCount, availableYears,
    };
}
