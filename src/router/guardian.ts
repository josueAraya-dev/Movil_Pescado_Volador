import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    publica?: boolean;
    permiso?: string;
  }
}

export const RUTA_LOGIN = '/login';
export const RUTA_INICIO = '/tabs/productos';

type Destino = Pick<RouteLocationNormalized, 'path' | 'fullPath' | 'meta'>;

export interface EstadoSesion {
  autenticado: boolean;
  puede: (permiso: string) => boolean;
}

export function resolverAcceso(destino: Destino, sesion: EstadoSesion): true | RouteLocationRaw {
  if (!destino.meta.publica && !sesion.autenticado) {
    return { path: RUTA_LOGIN, query: { redirect: destino.fullPath } };
  }

  // Con sesión no se vuelve al login (cubre el botón atrás de Android).
  if (destino.path === RUTA_LOGIN && sesion.autenticado) {
    return RUTA_INICIO;
  }

  if (destino.meta.permiso && !sesion.puede(destino.meta.permiso) && destino.path !== RUTA_INICIO) {
    return RUTA_INICIO;
  }

  return true;
}

export function destinoTrasLogin(redirect: unknown): string {
  if (typeof redirect !== 'string') return RUTA_INICIO;
  // Solo rutas internas, para evitar redirecciones abiertas.
  if (!redirect.startsWith('/') || redirect.startsWith('//')) return RUTA_INICIO;
  if (redirect.startsWith(RUTA_LOGIN)) return RUTA_INICIO;
  return redirect;
}
