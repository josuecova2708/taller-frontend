import axios from 'axios';
import Cookies from 'js-cookie';
import { TOKEN_COOKIE } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get(TOKEN_COOKIE);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // 401: el token no sirve -> cerrar sesión.
    // 403: el token es válido pero el rol no alcanza -> NO cerrar sesión,
    //      la pantalla debe mostrar el mensaje de permiso insuficiente.
    if (status === 401 && typeof window !== 'undefined') {
      Cookies.remove(TOKEN_COOKIE, { path: '/' });
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

export default api;
