import api from '../../../../shared/services/api';

export async function obtenerUsuarios() {
    const res = await api.get('/usuarios/');
    return res.data;
}

export async function crearUsuario(datos) {
    const res = await api.post('/usuarios/', datos);
    return res.data;
}

export async function cambiarRolUsuario(usuarioId, nuevoRol) {
    const res = await api.patch(`/usuarios/${usuarioId}/rol/`, { role: nuevoRol });
    return res.data;
}

export async function alternarEstadoUsuario(usuarioId) {
    const res = await api.patch(`/usuarios/${usuarioId}/estado/`);
    return res.data;
}

export async function importarUsuariosMasivo(registros) {
    const res = await api.post('/usuarios/importar/', { registros });
    return res.data;
}
