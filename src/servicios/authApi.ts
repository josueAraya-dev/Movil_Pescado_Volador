import { api } from './api';

export interface RespuestaLogin {
  token: string;
  token_type: 'Bearer';
  expires_at: string | null;
  abilities: string[];
}

export async function iniciarSesionApi(email: string, password: string): Promise<RespuestaLogin> {
  const { data } = await api.post<RespuestaLogin>('/login', { email, password });
  return data;
}

export async function cerrarSesionApi(): Promise<void> {
  await api.post('/logout');
}
