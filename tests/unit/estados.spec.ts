import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { crearAdaptador, reiniciarSimuladores } from './simuladores';

import EstadoCarga from '@/components/EstadoCarga.vue';
import EstadoError from '@/components/EstadoError.vue';
import EstadoVacio from '@/components/EstadoVacio.vue';
import MensajeAviso from '@/components/MensajeAviso.vue';
import { api } from '@/servicios/api';
import { useProductosStore } from '@/stores/productos';
import { useSesionStore } from '@/stores/sesion';

vi.mock('@capacitor/preferences', async () => (await import('./simuladores')).preferences);
vi.mock('@aparajita/capacitor-secure-storage', async () => (await import('./simuladores')).secureStorage);

beforeEach(() => {
  setActivePinia(createPinia());
  reiniciarSimuladores();
});

describe('componentes de estado', () => {
  test('carga: ion-spinner con el texto', () => {
    const w = mount(EstadoCarga, { props: { mensaje: 'Cargando productos…' } });
    expect(w.find('ion-spinner').exists()).toBe(true);
    expect(w.attributes('role')).toBe('status');
    expect(w.text()).toContain('Cargando productos…');
  });

  test('error: ion-card con role="alert" y botón Reintentar que emite el evento', async () => {
    const w = mount(EstadoError, { props: { mensaje: 'No se pudo conectar con el servidor.' } });
    expect(w.find('ion-card').attributes('role')).toBe('alert');
    expect(w.text()).toContain('No se pudo conectar con el servidor.');

    await w.find('ion-button').trigger('click');
    expect(w.emitted('reintentar')).toHaveLength(1);
  });

  test('error sin reintento (por ejemplo, credenciales incorrectas) no muestra el botón', () => {
    const w = mount(EstadoError, { props: { mensaje: 'Credenciales incorrectas.', sinReintento: true } });
    expect(w.find('ion-button').exists()).toBe(false);
  });

  test('vacío: mensaje y acción opcional', async () => {
    const w = mount(EstadoVacio, { props: { mensaje: 'No hay ventas por mostrar todavía.', accion: 'Recargar' } });
    expect(w.text()).toContain('No hay ventas por mostrar todavía.');
    await w.find('ion-button').trigger('click');
    expect(w.emitted('accion')).toHaveLength(1);

    const sinAccion = mount(EstadoVacio, { props: { mensaje: 'Sin datos.' } });
    expect(sinAccion.find('ion-button').exists()).toBe(false);
  });

  test('los mensajes de éxito se anuncian como estado y llevan la clase del tipo', () => {
    const w = mount(MensajeAviso, { props: { tipo: 'exito' }, slots: { default: 'Recepción confirmada.' } });
    expect(w.find('ion-card').classes()).toContain('mensaje--exito');
    expect(w.find('ion-card').attributes('role')).toBe('status');
  });
});

describe('catálogos del formulario de productos', () => {
  test('si el servidor falla, queda un error reintentable y el reintento lo resuelve', async () => {
    await useSesionStore().abrirSesion({
      token: 't',
      expiraEn: null,
      permisos: ['view categories', 'view brands', 'view units'],
      correo: 'admin@example.com',
    });
    let falla = true;
    api.defaults.adapter = crearAdaptador((config) => {
      if (falla && config.url === '/brands') return { status: 500, data: { message: 'Ocurrió un error interno.' } };
      return { status: 200, data: { data: [] } };
    }).adaptador;
    const productos = useProductosStore();

    await productos.cargarCatalogos();
    expect(productos.errorCatalogos).toBe('Ocurrió un error interno.');

    falla = false;
    await productos.cargarCatalogos();
    expect(productos.errorCatalogos).toBeNull();
    expect(productos.cargandoCatalogos).toBe(false);
  });

  test('la falta de permiso no se ofrece como reintento (no se arregla reintentando)', async () => {
    await useSesionStore().abrirSesion({
      token: 't',
      expiraEn: null,
      permisos: ['view products'],
      correo: 'bodeguero@example.com',
    });
    const { adaptador, solicitudes } = crearAdaptador(() => ({ status: 200, data: { data: [] } }));
    api.defaults.adapter = adaptador;
    const productos = useProductosStore();

    await productos.cargarCatalogos();

    expect(solicitudes).toHaveLength(0);
    expect(productos.erroresCatalogo.categorias).toMatch(/no tiene permiso/);
    expect(productos.errorCatalogos).toBeNull();
  });
});
