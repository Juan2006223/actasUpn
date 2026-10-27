import api from '../../../../shared/services/api';

export const getActas = () => api.get('/actas/reuniones/');
export const getMisActas = () => api.get('/actas/reuniones/mis/');
export const createActa = (data) => api.post('/actas/reuniones/', data);
export const updateActa = (id, data) => api.put(`/actas/reuniones/${id}/`, data);
export const deleteActa = (id) => api.delete(`/actas/reuniones/${id}/`);
export const getMiFirma = () => api.get('/actas/mi-firma/');
export const saveMiFirma = (firma_data) => api.post('/actas/mi-firma/', { firma_data });
export const searchUsers = (q) => api.get(`/usuarios/buscar/?q=${encodeURIComponent(q)}`);
export const getAgonCourses = () => api.get('/grupos/cursos/');
