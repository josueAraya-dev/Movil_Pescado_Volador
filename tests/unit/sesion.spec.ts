import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { contenidoAlmacenSeguro, contenidoPreferencias, reiniciarSimuladores } from './simuladores';

import { sesionVencida, useSesionStore } from '@/stores/sesion';

vi.mock('@capacitor/preferences', async () => (await import('./simuladores')).preferences);
vi.mock('@aparajita/capacitor-secure-storage', async () => (await import('./simuladores')).secureStorage);

const futuro = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const pasado = new Date(Date.now() - 60 * 1000).toISOString();
const SESION = { token: 'abc', expiraEn: futuro, permisos: ['view sales'], correo: 'cajero@example.com' };

beforeEach(() => {
  setActivePinia(createPinia());
  reiniciarSimuladores();
});

describe('store de sesión', () => {
  test('abrirSesion guarda el token en el almacenamiento seguro (no en Preferences)', async () => {
    await useSesionStore().abrirSesion(SESION);

    expect(contenidoAlmacenSeguro().get('sesion')).toEqual(SESION);
    expect([...contenidoPreferencias().values()].some((v) => v.includes('abc'))).toBe(false);
  });

  test('restaurar recupera una sesión vigente al abrir la app', async () => {
    contenidoAlmacenSeguro().set('sesion', SESION);
    const sesion = useSesionStore();

    await sesion.restaurar();

    expect(sesion.autenticado).toBe(true);
    expect(sesion.puede('view sales')).toBe(true);
    expect(sesion.puede('update sales')).toBe(false);
  });

  test('restaurar descarta un token vencido junto con la caché', async () => {
    contenidoAlmacenSeguro().set('sesion', { ...SESION, expiraEn: pasado });
    contenidoPreferencias().set('cache.ventas', '{}');
    const sesion = useSesionStore();

    await sesion.restaurar();

    expect(sesion.autenticado).toBe(false);
    expect(contenidoAlmacenSeguro().size).toBe(0);
    expect(contenidoPreferencias().has('cache.ventas')).toBe(false);
  });

  test('cerrarSesion borra el token cifrado y la caché, pero conserva el tema', async () => {
    const sesion = useSesionStore();
    await sesion.abrirSesion(SESION);
    contenidoPreferencias().set('cache.productos', '{}');
    contenidoPreferencias().set('tema', 'oscuro');

    await sesion.cerrarSesion();

    expect(sesion.autenticado).toBe(false);
    expect(contenidoAlmacenSeguro().size).toBe(0);
    expect(contenidoPreferencias().has('cache.productos')).toBe(false);
    expect(contenidoPreferencias().get('tema')).toBe('oscuro');
  });
});

describe('sesionVencida', () => {
  test.each([
    [null, false],
    [futuro, false],
    [pasado, true],
    ['no-es-fecha', true],
  ])('expiraEn=%s → %s', (expiraEn, esperado) => {
    expect(sesionVencida(expiraEn)).toBe(esperado);
  });
});
