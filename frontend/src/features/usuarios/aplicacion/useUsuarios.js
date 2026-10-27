import { useState, useEffect, useCallback, useMemo } from 'react';
import { calcularResumenRoles, filtrarUsuarios, validarNuevoUsuario } from '../dominio/usuarioModel';

export function useUsuarios(usuariosService) {
    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [rolFiltro, setRolFiltro] = useState('TODOS');
    const [procesandoId, setProcesandoId] = useState(null);

    const cargar = useCallback(async () => {
        setCargando(true);
        setError(null);
        try {
            const data = await usuariosService.obtenerUsuarios();
            setUsuarios(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar los usuarios.');
        } finally {
            setCargando(false);
        }
    }, [usuariosService]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const cambiarRol = async (usuarioId, nuevoRol) => {
        setProcesandoId(usuarioId);
        try {
            const actualizado = await usuariosService.cambiarRolUsuario(usuarioId, nuevoRol);
            setUsuarios((prev) => prev.map((u) => (u.id === usuarioId ? actualizado : u)));
            return { ok: true };
        } catch (err) {
            const msg = err?.response?.data?.detail || 'No se pudo actualizar el rol.';
            setError(msg);
            return { ok: false, error: msg };
        } finally {
            setProcesandoId(null);
        }
    };

    const alternarEstado = async (usuarioId) => {
        setProcesandoId(usuarioId);
        try {
            const actualizado = await usuariosService.alternarEstadoUsuario(usuarioId);
            setUsuarios((prev) => prev.map((u) => (u.id === usuarioId ? actualizado : u)));
            return { ok: true };
        } catch (err) {
            const msg = err?.response?.data?.detail || 'No se pudo cambiar el estado del usuario.';
            setError(msg);
            return { ok: false, error: msg };
        } finally {
            setProcesandoId(null);
        }
    };

    const crearUsuario = async (datos) => {
        const validacion = validarNuevoUsuario(datos);
        if (!validacion.valido) {
            return { ok: false, error: validacion.error };
        }
        try {
            const nuevo = await usuariosService.crearUsuario(datos);
            setUsuarios((prev) => [nuevo, ...prev]);
            return { ok: true, usuario: nuevo };
        } catch (err) {
            const msg = err?.response?.data?.detail || 'Error al registrar el usuario en el directorio.';
            return { ok: false, error: msg };
        }
    };

    const importarMasivo = async (registros) => {
        const resultado = await usuariosService.importarUsuariosMasivo(registros);
        await cargar();
        return resultado;
    };

    const usuariosFiltrados = useMemo(
        () => filtrarUsuarios(usuarios, busqueda, rolFiltro),
        [usuarios, busqueda, rolFiltro]
    );

    const resumenRoles = useMemo(() => calcularResumenRoles(usuarios), [usuarios]);

    return {
        usuarios: usuariosFiltrados,
        todosLosUsuarios: usuarios,
        resumenRoles,
        cargando,
        error,
        busqueda,
        setBusqueda,
        rolFiltro,
        setRolFiltro,
        procesandoId,
        cambiarRol,
        alternarEstado,
        crearUsuario,
        importarMasivo,
        recargar: cargar,
    };
}
