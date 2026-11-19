import { useState, useEffect, useCallback, useMemo } from 'react';
import { calcularResumenRoles, filtrarUsuarios, validarNuevoUsuario } from '../dominio/usuarioModel';

export function useUsuarios(usuariosService) {
    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [rolFiltro, setRolFiltro] = useState('TODOS');
    const [procesandoId, setProcesandoId] = useState(null);
    const [dependencias, setDependencias] = useState([]);

    const cargar = useCallback(async () => {
        setCargando(true);
        setError(null);
        try {
            const [data, deps] = await Promise.all([
                usuariosService.obtenerUsuarios(),
                usuariosService.obtenerDependencias().catch(() => []),
            ]);
            setUsuarios(Array.isArray(data) ? data : []);
            setDependencias(Array.isArray(deps) ? deps : []);
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

    const actualizarPerfil = async (usuarioId, datos) => {
        setProcesandoId(usuarioId);
        try {
            const actualizado = await usuariosService.actualizarUsuario(usuarioId, datos);
            setUsuarios((prev) => prev.map((u) => (u.id === usuarioId ? actualizado : u)));
            return { ok: true };
        } catch (err) {
            return { ok: false, error: err?.response?.data?.detail || 'No se pudo actualizar el usuario.' };
        } finally {
            setProcesandoId(null);
        }
    };

    // Dependencias: tras cada cambio se recarga la lista para tener el conteo de usuarios al día.
    const conDependencias = async (accion, mensajeError) => {
        try {
            await accion();
            setDependencias(await usuariosService.obtenerDependencias());
            return { ok: true };
        } catch (err) {
            return { ok: false, error: err?.response?.data?.detail || mensajeError };
        }
    };
    const crearDependencia = (nombre) =>
        conDependencias(() => usuariosService.crearDependencia(nombre), 'No se pudo crear la dependencia.');
    const actualizarDependencia = (id, datos) =>
        conDependencias(() => usuariosService.actualizarDependencia(id, datos), 'No se pudo actualizar la dependencia.');
    const eliminarDependencia = (id) =>
        conDependencias(() => usuariosService.eliminarDependencia(id), 'No se pudo eliminar la dependencia.');

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
        actualizarPerfil,
        dependencias,
        crearDependencia,
        actualizarDependencia,
        eliminarDependencia,
        alternarEstado,
        crearUsuario,
        importarMasivo,
        recargar: cargar,
    };
}
