import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    calcularPendientesPorFirmar, extraerAniosDisponibles,
    aplicarFirmaEnActa, agregarComentarioEnActa
} from '../dominio/actaModel';

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
            if (acta.id && !acta.isNew) {
                await actasService.updateActa(acta.id, acta);
                addToast?.('Acta actualizada con éxito', 'success');
            } else {
                await actasService.createActa(acta);
                addToast?.('Acta creada con éxito', 'success');
            }
            await loadActas();
            return true;
        } catch {
            addToast?.('Error al guardar el acta', 'error');
            return false;
        }
    };

    const deleteActa = async (id) => {
        try {
            await actasService.deleteActa(id);
            addToast?.('Acta eliminada', 'success');
            await loadActas();
            return true;
        } catch {
            addToast?.('Error al eliminar el acta', 'error');
            return false;
        }
    };

    const firmarActa = async (actaId, firmaData) => {
        try {
            const acta = [...actas, ...misActas].find(a => a.id === actaId);
            if (!acta) return false;
            const actualizada = aplicarFirmaEnActa(acta, user?.id, firmaData);
            await actasService.updateActa(actaId, actualizada);
            addToast?.('Acta firmada exitosamente', 'success');
            await loadActas();
            return true;
        } catch {
            addToast?.('Error al firmar acta', 'error');
            return false;
        }
    };

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

    const comentar = async (actaId, texto) => {
        try {
            const acta = [...actas, ...misActas].find(a => a.id === actaId);
            if (!acta) return false;
            const autor = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username;
            const actualizada = agregarComentarioEnActa(acta, autor, texto);
            await actasService.updateActa(actaId, actualizada);
            addToast?.('Comentario registrado', 'success');
            await loadActas();
            return true;
        } catch {
            addToast?.('Error al registrar comentario', 'error');
            return false;
        }
    };

    const pendingCount = useMemo(() => calcularPendientesPorFirmar(misActas, user?.id), [misActas, user]);
    const availableYears = useMemo(() => extraerAniosDisponibles(actas, misActas), [actas, misActas]);

    return {
        actas, misActas, loading,
        firmaPersonal, setFirmaPersonal,
        loadActas, saveActa, deleteActa,
        firmarActa, guardarFirmaPersonal, comentar,
        pendingCount, availableYears,
    };
}
