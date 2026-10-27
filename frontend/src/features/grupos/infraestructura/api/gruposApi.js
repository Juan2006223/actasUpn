import api from '../../../../shared/services/api';

export const getGrupos = () => api.get('/grupos/');
export const createGrupo = (data) => api.post('/grupos/', data);
export const deleteGrupo = (id) => api.delete(`/grupos/${id}/`);
export const getTeachers = () => api.get('/usuarios/buscar/?q=directorio');
export const searchDirectoryUsers = (q) => api.get(`/usuarios/buscar/?q=${encodeURIComponent(q)}`);
export const getAgonCourses = () => api.get('/grupos/cursos/');
