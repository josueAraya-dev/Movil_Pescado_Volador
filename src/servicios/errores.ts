import { isAxiosError } from 'axios';

import type { ErroresCampo } from '@/types/modelos';

export class ErrorApi extends Error {
  constructor(
    public readonly status: number,
    mensaje: string,
    public readonly errores: ErroresCampo = {},
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }

  get esDeConexion(): boolean {
    return this.status === 0;
  }
}

export const MENSAJE_SIN_SERVIDOR = 'No se pudo conectar con el servidor. Verifique que la API esté en ejecución.';

export function aErrorApi(error: unknown): ErrorApi {
  if (error instanceof ErrorApi) return error;

  if (isAxiosError(error)) {
    if (!error.response) {
      const mensaje =
        error.code === 'ECONNABORTED' ? 'El servidor tardó demasiado en responder.' : MENSAJE_SIN_SERVIDOR;
      return new ErrorApi(0, mensaje);
    }

    const { status, data } = error.response as { status: number; data?: { message?: string; errors?: ErroresCampo } };
    return new ErrorApi(status, data?.message ?? `El servidor respondió con error ${status}.`, data?.errors ?? {});
  }

  return new ErrorApi(-1, error instanceof Error ? error.message : 'Ocurrió un error inesperado.');
}
