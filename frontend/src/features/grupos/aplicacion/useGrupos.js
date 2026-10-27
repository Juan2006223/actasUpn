import { useState, useEffect, useCallback } from 'react';
import { validarGrupo, paginarGrupos } from '../dominio/grupoModel';

export function useGrupos(notify, gruposService) {
    const [grupos, setGrupos] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);

    const loadAll = useCallback(async () => {
        if (!gruposService) return;
        setLoading(true);
        try {
            const [g, t] = await Promise.all([
                gruposService.getGrupos().catch(() => ({ data: [] })),
                gruposService.getTeachers().catch(() => ({ data: [] })),
            ]);
            setGrupos(g.data || []);
            setTeachers(t.data || []);
        } catch {
            notify?.('Error cargando datos', 'error');
        } finally {
            setLoading(false);
        }
    }, [notify, gruposService]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    const guardarGrupo = async (form) => {
        const datosValidos = validarGrupo(form);
        const { data } = await gruposService.createGrupo(datosValidos);
        setGrupos(prev => [data, ...prev]);
        notify?.('Grupo/Cohorte guardado');
        return data;
    };

    const eliminarGrupo = async (id) => {
        await gruposService.deleteGrupo(id);
        setGrupos(prev => prev.filter(g => g.id !== id));
        notify?.('Grupo eliminado');
    };

    const { totalPages, pageData } = paginarGrupos(grupos, page, 10);

    return {
        grupos,
        teachers,
        loading,
        page,
        setPage,
        totalPages,
        pageData,
        guardarGrupo,
        eliminarGrupo,
    };
}
