import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { contenidoPreferencias, crearAdaptador, reiniciarSimuladores } from './simuladores';

import { api } from '@/servicios/api';
import {
  aCuerpoApi,
  aProducto,
  listarCategorias,
  traducirErrores,
  type CuerpoProducto,
} from '@/servicios/productosApi';
import { aVenta } from '@/servicios/ventasApi';
import { useProductosStore } from '@/stores/productos';
import { useRedStore } from '@/stores/red';
import { useSesionStore } from '@/stores/sesion';
import type { Producto } from '@/types/modelos';

vi.mock('@capacitor/preferences', async () => (await import('./simuladores')).preferences);
vi.mock('@aparajita/capacitor-secure-storage', async () => (await import('./simuladores')).secureStorage);

const producto = (id: number, nombre: string, sku: string): Producto => ({
  id,
  id_categoria: 1,
  id_marca: 1,
  id_unidad: 1,
  nombre,
  descripcion: null,
  sku,
  codigo_barras: null,
  precio: 1000,
  tasa_impuesto: 0.13,
  cantidad_stock: 5,
  stock_minimo: 1,
  stock_maximo: null,
  peso: null,
  esta_activo: true,
});

const paginaApi = (datos: Producto[], pagina = 1, ultima = 1) => ({
  status: 200,
  data: { data: datos, meta: { current_page: pagina, last_page: ultima, total: datos.length } },
});

const guardarEnCache = (datos: Producto[]) =>
  contenidoPreferencias().set('cache.productos', JSON.stringify({ datos, guardadoEn: '2026-11-06T21:15:00.000Z' }));

beforeEach(() => {
  setActivePinia(createPinia());
  reiniciarSimuladores();
});

describe('adaptadores de productos', () => {
  const cuerpo: CuerpoProducto = {
    id_categoria: 1,
    id_marca: 2,
    id_unidad: 3,
    nombre: ' Martillo ',
    descripcion: null,
    sku: 'SKU-1',
    codigo_barras: null,
    precio: 4512,
    tasa_impuesto: null,
    cantidad_stock: 10,
    stock_minimo: null,
    stock_maximo: 300,
    peso: 0.6,
    esta_activo: true,
  };

  test('el formulario se envía con los nombres en inglés que espera la API', () => {
    expect(aCuerpoApi(cuerpo)).toEqual({
      category_id: 1,
      brand_id: 2,
      unit_id: 3,
      name: 'Martillo',
      description: null,
      sku: 'SKU-1',
      barcode: null,
      price: 4512,
      stock_quantity: 10,
      maximum_stock: 300,
      weight: 0.6,
      is_active: true,
    });
  });

  test('tax_rate y minimum_stock se omiten si van vacíos (la base usa su valor por defecto)', () => {
    const enviado = aCuerpoApi({ ...cuerpo, tasa_impuesto: 0.1, stock_minimo: 2 });
    expect(enviado.tax_rate).toBe(0.1);
    expect(enviado.minimum_stock).toBe(2);
    expect('tax_rate' in aCuerpoApi(cuerpo)).toBe(false);
  });

  test('los errores 422 se traducen a los campos del formulario', () => {
    expect(traducirErrores({ name: ['x'], price: ['y'], category_id: ['z'] })).toEqual({
      nombre: ['x'],
      precio: ['y'],
      id_categoria: ['z'],
    });
  });

  test('los números que llegan como texto se convierten', () => {
    const conTextos = { ...producto(1, 'A', 'S'), peso: '9.73', precio: '12.5' } as unknown as Producto;
    expect(aProducto(conTextos)).toMatchObject({ peso: 9.73, precio: 12.5 });

    const venta = aVenta({
      id: 1,
      user_id: 1,
      id_customer: 'CUS1',
      sale_date: '2026-11-04T00:00:00.000000Z',
      total: '1.00',
      tax_amount: null,
      discount: '0.00',
      status: 'completado',
    });
    expect(venta).toMatchObject({ total: 1, tax_amount: 0, discount: 0, id_customer: 'CUS1' });
  });

  test('las categorías con claves "ID Categoria" / "Nombre" se normalizan', async () => {
    api.defaults.adapter = crearAdaptador(() => ({
      status: 200,
      data: { data: [{ 'ID Categoria': 3, Nombre: 'Hogar', Descripcion: '...' }] },
    })).adaptador;

    expect(await listarCategorias()).toEqual([{ id: 3, nombre: 'Hogar' }]);
  });
});

describe('store de productos: caché y conexión (punto 6)', () => {
  test('con conexión carga de la API y guarda el listado sin filtro en caché', async () => {
    api.defaults.adapter = crearAdaptador(() => paginaApi([producto(1, 'Martillo', 'SKU-1')])).adaptador;
    const productos = useProductosStore();

    await productos.cargar('');

    expect(productos.desdeCache).toBe(false);
    expect(JSON.parse(contenidoPreferencias().get('cache.productos') ?? '{}').datos).toHaveLength(1);
  });

  test('una búsqueda con conexión NO reemplaza la caché del listado completo', async () => {
    const todos = [producto(1, 'Martillo', 'SKU-1'), producto(2, 'Cable', 'SKU-2')];
    api.defaults.adapter = crearAdaptador(() => paginaApi(todos)).adaptador;
    const productos = useProductosStore();
    await productos.cargar('');

    api.defaults.adapter = crearAdaptador(() => paginaApi([producto(2, 'Cable', 'SKU-2')])).adaptador;
    await productos.cargar('cable');

    expect(JSON.parse(contenidoPreferencias().get('cache.productos') ?? '{}').datos).toHaveLength(2);
  });

  test('sin conexión muestra la caché con su marca de tiempo y filtra localmente', async () => {
    guardarEnCache([producto(1, 'Martillo', 'SKU-1'), producto(2, 'Cable', 'SKU-2')]);
    const { adaptador, solicitudes } = crearAdaptador(() => paginaApi([]));
    api.defaults.adapter = adaptador;
    useRedStore().conectado = false;
    const productos = useProductosStore();

    await productos.cargar('cable');

    expect(solicitudes).toHaveLength(0);
    expect(productos.desdeCache).toBe(true);
    expect(productos.origenCache).toBe('sin-conexion');
    expect(productos.guardadoEn).toBe('2026-11-06T21:15:00.000Z');
    expect(productos.productos.map((p) => p.nombre)).toEqual(['Cable']);
    expect(productos.hayMas).toBe(false);
  });

  test('si el servidor no responde, también usa la caché (origen sin-servidor)', async () => {
    guardarEnCache([producto(1, 'Martillo', 'SKU-1')]);
    api.defaults.adapter = crearAdaptador(() => 'sin-red').adaptador;
    const productos = useProductosStore();

    await productos.cargar('');

    expect(productos.desdeCache).toBe(true);
    expect(productos.origenCache).toBe('sin-servidor');
  });

  test('si se pierde la conexión con la app abierta, pasa a la caché y muestra el aviso', async () => {
    api.defaults.adapter = crearAdaptador(() => paginaApi([producto(1, 'Martillo', 'SKU-1')])).adaptador;
    const productos = useProductosStore();
    await useSesionStore().abrirSesion({ token: 't', expiraEn: null, permisos: [], correo: 'a@b.c' });
    await productos.cargar('');
    expect(productos.desdeCache).toBe(false);

    useRedStore().conectado = false;
    await vi.waitFor(() => expect(productos.desdeCache).toBe(true));

    expect(productos.guardadoEn).not.toBeNull();
    expect(productos.productos.map((p) => p.nombre)).toEqual(['Martillo']);
  });

  test('sin conexión y sin caché muestra un error', async () => {
    useRedStore().conectado = false;
    const productos = useProductosStore();

    await productos.cargar('');

    expect(productos.error).toMatch(/Sin conexión/);
    expect(productos.productos).toHaveLength(0);
  });

  test('sin conexión, el detalle se lee de la caché del listado', async () => {
    guardarEnCache([producto(7, 'Taladro', 'SKU-7')]);
    useRedStore().conectado = false;

    const resultado = await useProductosStore().obtener(7);

    expect(resultado).toMatchObject({ desdeCache: true, producto: { nombre: 'Taladro' } });
  });

  test('el scroll infinito agrega la siguiente página', async () => {
    api.defaults.adapter = crearAdaptador((config) =>
      config.params.page === 1 ? paginaApi([producto(1, 'A', 'S1')], 1, 2) : paginaApi([producto(2, 'B', 'S2')], 2, 2),
    ).adaptador;
    const productos = useProductosStore();

    await productos.cargar('');
    expect(productos.hayMas).toBe(true);
    await productos.cargarMas();

    expect(productos.productos.map((p) => p.id)).toEqual([1, 2]);
    expect(productos.hayMas).toBe(false);
  });
});
