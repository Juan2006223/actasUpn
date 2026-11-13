import api from '../../../../shared/services/api';

export const getConfig = () => api.get('/grabaciones/config/');
export const crearGrabacion = (datos) => api.post('/grabaciones/', datos);
export const consultarGrabacion = (id, ligero = false) => api.get(`/grabaciones/${id}/${ligero ? '?ligero=1' : ''}`);
export const eliminarGrabacion = (id) => api.delete(`/grabaciones/${id}/`);
export const volverARedactar = (id, datos) => api.post(`/grabaciones/${id}/redactar/`, datos);
export const subirParte = (id, parte, offset, blob, onUploadProgress) => api.put(
    `/grabaciones/${id}/contenido/?parte=${parte}&offset=${offset}`,
    blob,
    { headers: { 'Content-Type': 'application/octet-stream' }, onUploadProgress, timeout: 10 * 60 * 1000 },
);
