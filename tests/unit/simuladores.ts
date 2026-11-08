import { AxiosError, AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';

const preferencias = new Map<string, string>();
const almacenSeguro = new Map<string, unknown>();

export const preferences = {
  Preferences: {
    async set({ key, value }: { key: string; value: string }): Promise<void> {
      preferencias.set(key, value);
    },
    async get({ key }: { key: string }): Promise<{ value: string | null }> {
      return { value: preferencias.get(key) ?? null };
    },
    async remove({ key }: { key: string }): Promise<void> {
      preferencias.delete(key);
    },
  },
};

export const secureStorage = {
  SecureStorage: {
    async set(clave: string, valor: unknown): Promise<void> {
      almacenSeguro.set(clave, JSON.parse(JSON.stringify(valor)));
    },
    async get(clave: string): Promise<unknown> {
      return almacenSeguro.get(clave) ?? null;
    },
    async remove(clave: string): Promise<boolean> {
      return almacenSeguro.delete(clave);
    },
  },
};

export function reiniciarSimuladores(): void {
  preferencias.clear();
  almacenSeguro.clear();
}

export function contenidoPreferencias(): Map<string, string> {
  return preferencias;
}

export function contenidoAlmacenSeguro(): Map<string, unknown> {
  return almacenSeguro;
}

export type RespuestaSimulada = { status: number; data?: unknown } | 'sin-red';

export function crearAdaptador(responder: (config: InternalAxiosRequestConfig) => RespuestaSimulada): {
  adaptador: AxiosAdapter;
  solicitudes: InternalAxiosRequestConfig[];
} {
  const solicitudes: InternalAxiosRequestConfig[] = [];
  const adaptador: AxiosAdapter = async (config) => {
    solicitudes.push(config);
    const respuesta = responder(config);
    if (respuesta === 'sin-red') {
      throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);
    }
    const completa = {
      status: respuesta.status,
      data: respuesta.data,
      statusText: '',
      headers: new AxiosHeaders(),
      config,
    };
    if (respuesta.status >= 400) {
      throw new AxiosError('Error', AxiosError.ERR_BAD_REQUEST, config, null, completa);
    }
    return completa;
  };
  return { adaptador, solicitudes };
}
