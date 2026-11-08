import { describe, expect, test } from 'vitest';

import { destinoTrasLogin, resolverAcceso, RUTA_INICIO, RUTA_LOGIN } from '@/router/guardian';

const conSesion = (...permisos: string[]) => ({ autenticado: true, puede: (p: string) => permisos.includes(p) });
const sinSesion = { autenticado: false, puede: () => false };

const privada = { path: '/tabs/ventas', fullPath: '/tabs/ventas?x=1', meta: { permiso: 'view sales' } };
const login = { path: RUTA_LOGIN, fullPath: RUTA_LOGIN, meta: { publica: true } };

describe('resolverAcceso (guardián de rutas)', () => {
  test('sin sesión, una ruta privada redirige al login recordando el destino', () => {
    expect(resolverAcceso(privada, sinSesion)).toEqual({ path: RUTA_LOGIN, query: { redirect: '/tabs/ventas?x=1' } });
  });

  test('con sesión y permiso, una ruta privada se permite', () => {
    expect(resolverAcceso(privada, conSesion('view sales'))).toBe(true);
  });

  test('con sesión pero sin el permiso de la ruta, vuelve al inicio', () => {
    expect(resolverAcceso(privada, conSesion('view products'))).toBe(RUTA_INICIO);
  });

  test('el inicio nunca redirige a sí mismo aunque falte el permiso', () => {
    const inicio = { path: RUTA_INICIO, fullPath: RUTA_INICIO, meta: { permiso: 'view products' } };
    expect(resolverAcceso(inicio, conSesion())).toBe(true);
  });

  test('sin sesión, el login se permite', () => {
    expect(resolverAcceso(login, sinSesion)).toBe(true);
  });

  test('con sesión, volver al login redirige al inicio (botón atrás de Android)', () => {
    expect(resolverAcceso(login, conSesion())).toBe(RUTA_INICIO);
  });

  test('una ruta sin meta.publica se trata como privada', () => {
    expect(resolverAcceso({ path: '/nueva', fullPath: '/nueva', meta: {} }, sinSesion)).not.toBe(true);
  });
});

describe('destinoTrasLogin', () => {
  test('usa el redirect si es una ruta interna', () => {
    expect(destinoTrasLogin('/tabs/ventas')).toBe('/tabs/ventas');
  });

  test.each([undefined, null, 'https://otro.sitio', '//otro.sitio', RUTA_LOGIN, `${RUTA_LOGIN}?redirect=/x`])(
    'ignora el redirect %s y va al inicio',
    (redirect) => {
      expect(destinoTrasLogin(redirect)).toBe(RUTA_INICIO);
    },
  );
});
