import api from '../../../../shared/services/api';

export const loginUser = (username, password) =>
    api.post('/auth/login/', { username, password }, { headers: { Authorization: '' } });
export const getMe = () => api.get('/auth/me/');
export const searchUsers = (q) => api.get(`/usuarios/buscar/?q=${encodeURIComponent(q)}`);
export const getTeachers = () => api.get('/usuarios/buscar/?q=profesor');
