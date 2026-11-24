import api from '../../../../shared/services/api';

export const getActas = () => api.get('/actas/reuniones/');
export const getMisActas = () => api.get('/actas/reuniones/mis/');
export const createActa = (data) => api.post('/actas/reuniones/', data);
export const updateActa = (id, data) => api.put(`/actas/reuniones/${id}/`, data);
export const deleteActa = (id) => api.delete(`/actas/reuniones/${id}/`);
export const getMiFirma = () => api.get('/actas/mi-firma/');
export const saveMiFirma = (firma_data) => api.post('/actas/mi-firma/', { firma_data });
export const deleteMiFirma = () => api.delete('/actas/mi-firma/');
export const searchUsers = (q) => api.get(`/usuarios/buscar/?q=${encodeURIComponent(q)}`);
export const getAgonCourses = () => api.get('/grupos/cursos/');
export const firmarActa = (id, firma_data) => api.post(`/actas/reuniones/${id}/firmar/`, firma_data ? { firma_data } : {});
export const agregarObservacion = (id, texto) => api.post(`/actas/reuniones/${id}/observaciones/`, { texto });
export const cambiarEstadoActa = (id, estado, motivo = '') => api.post(`/actas/reuniones/${id}/estado/`, { estado, motivo });
