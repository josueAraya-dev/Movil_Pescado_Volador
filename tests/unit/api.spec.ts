import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { crearAdaptador, contenidoAlmacenSeguro, contenidoPreferencias, reiniciarSimuladores } from './simuladores';

import { api } from '@/servicios/api';
import { ErrorApi } from '@/servicios/errores';
import { useBorradorVentaStore } from '@/stores/borradorVenta';
import { useSesionStore } from '@/stores/sesion';

vi.mock('@capacitor/preferences', async () => (await import('./simuladores')).preferences);
vi.mock('@aparajita/capacitor-secure-storage', async () => (await import('./simuladores')).secureStorage);

const SESION = { token: 'token-de-prueba', expiraEn: null, permisos: ['view products'], correo: 'admin@example.com' };

beforeEach(() => {
  setActivePinia(createPinia());
  reiniciarSimuladores();
});

describe('interceptor de request', () => {
  test('adjunta Authorization: Bearer <token> a cada solicitud', async () => {
    const { adaptador, solicitudes } = crearAdaptador(() => ({ status: 200, data: {} }));
    api.defaults.adapter = adaptador;
    await useSesionStore().abrirSesion(SESION);

    await api.get('/products');
    await api.post('/sales', {});

    expect(solicitudes.map((s) => s.headers.Authorization)).toEqual([
      'Bearer token-de-prueba',
      'Bearer token-de-prueba',
    ]);
  });

  test('sin sesión no envía Authorization', async () => {
    const { adaptador, solicitudes } = crearAdaptador(() => ({ status: 200, data: {} }));
    api.defaults.adapter = adaptador;

    await api.get('/products');

    expect(solicitudes[0].headers.Authorization).toBeUndefined();
  });
});

describe('interceptor de response', () => {
  test('un 401 cierra la sesión, borra el token cifrado y la caché, y avisa la expiración', async () => {
    api.defaults.adapter = crearAdaptador(() => ({ status: 401, data: { message: 'No autenticado.' } })).adaptador;
    const sesion = useSesionStore();
    await sesion.abrirSesion(SESION);
    contenidoPreferencias().set('cache.productos', '{"datos":[],"guardadoEn":"2026-11-06"}');

    await expect(api.get('/products')).rejects.toMatchObject({ status: 401, message: 'No autenticado.' });

    expect(sesion.autenticado).toBe(false);
    expect(sesion.expiraciones).toBe(1);
    expect(contenidoAlmacenSeguro().size).toBe(0);
    expect(contenidoPreferencias().has('cache.productos')).toBe(false);
  });

  test('un 401 conserva el borrador de la venta para recuperarlo tras el login', async () => {
    api.defaults.adapter = crearAdaptador(() => ({ status: 401, data: { message: 'No autenticado.' } })).adaptador;
    await useSesionStore().abrirSesion(SESION);
    const borrador = useBorradorVentaStore();
    borrador.guardar('/tabs/ventas/nueva', { total: '4512' });

    await expect(api.post('/sales', {})).rejects.toBeInstanceOf(ErrorApi);

    expect(borrador.tomar('/tabs/ventas/nueva')).toEqual({ total: '4512' });
  });

  test('un 401 del login (credenciales incorrectas) NO se trata como sesión expirada', async () => {
    api.defaults.adapter = crearAdaptador(() => ({
      status: 401,
      data: { message: 'Las credenciales proporcionadas son incorrectas.' },
    })).adaptador;
    const sesion = useSesionStore();

    await expect(api.post('/login', {})).rejects.toMatchObject({ status: 401 });
    expect(sesion.expiraciones).toBe(0);
  });

  test('varios 401 a la vez cuentan una sola expiración', async () => {
    api.defaults.adapter = crearAdaptador(() => ({ status: 401, data: {} })).adaptador;
    const sesion = useSesionStore();
    await sesion.abrirSesion(SESION);

    await Promise.allSettled([api.get('/products'), api.get('/sales')]);

    expect(sesion.expiraciones).toBe(1);
  });

  test('sin red devuelve ErrorApi con status 0 (esDeConexion)', async () => {
    api.defaults.adapter = crearAdaptador(() => 'sin-red').adaptador;

    const error = await api.get('/products').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorApi);
    expect((error as ErrorApi).esDeConexion).toBe(true);
  });

  test('un 422 trae los errores por campo', async () => {
    api.defaults.adapter = crearAdaptador(() => ({
      status: 422,
      data: { message: 'Los datos enviados no son válidos.', errors: { total: ['El total es obligatorio.'] } },
    })).adaptador;

    await expect(api.post('/sales', {})).rejects.toMatchObject({
      status: 422,
      errores: { total: ['El total es obligatorio.'] },
    });
  });
});
