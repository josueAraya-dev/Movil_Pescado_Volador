import axios, { type AxiosError } from 'axios';

import { aErrorApi } from './errores';

import { useSesionStore } from '@/stores/sesion';

export const URL_API = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/+$/, '');

export const api = axios.create({
  baseURL: URL_API,
  timeout: 15000,
  headers: { Accept: 'application/json' },
});

// En estas rutas un 401 no significa sesión vencida.
const RUTAS_SIN_EXPIRACION = ['/login', '/logout'];

// Punto 3: único lugar que adjunta el token.
api.interceptors.request.use((config) => {
  const { token } = useSesionStore();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (respuesta) => respuesta,
  async (error: AxiosError) => {
    const errorApi = aErrorApi(error);

    // 401: se cierra la sesión y App.vue lleva al login.
    if (errorApi.status === 401 && !RUTAS_SIN_EXPIRACION.includes(error.config?.url ?? '')) {
      await useSesionStore().expirarSesion();
    }

    return Promise.reject(errorApi);
  },
);
