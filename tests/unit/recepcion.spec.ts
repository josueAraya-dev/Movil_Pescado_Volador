import type { InternalAxiosRequestConfig } from 'axios';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { crearAdaptador, reiniciarSimuladores, type RespuestaSimulada } from './simuladores';

import { api } from '@/servicios/api';
import { useProductosStore } from '@/stores/productos';
import { useRecepcionStore } from '@/stores/recepcion';
import { useRedStore } from '@/stores/red';
import type { DetalleRecepcion, Producto } from '@/types/modelos';

vi.mock('@capacitor/preferences', async () => (await import('./simuladores')).preferences);
vi.mock('@aparajita/capacitor-secure-storage', async () => (await import('./simuladores')).secureStorage);

const CODIGO = '0002165598478087';

const martillo = (stock: number): Producto => ({
  id: 2,
  id_categoria: 1,
  id_marca: 1,
  id_unidad: 1,
  nombre: 'Martillo de uña 16 oz',
  descripcion: null,
  sku: 'FERR-67240',
  codigo_barras: CODIGO,
  precio: 4500,
  tasa_impuesto: 0.13,
  cantidad_stock: stock,
  stock_minimo: 10,
  stock_maximo: 306,
  peso: null,
  esta_activo: true,
});

const detalle = (id: number, compra: string, cantidad: number): DetalleRecepcion => ({
  id,
  id_purchase: compra,
  product_id: 2,
  nombre: 'Martillo de uña 16 oz',
  barcode: CODIGO,
  quantity: cantidad,
  received_at: null,
});

const pagina = (datos: DetalleRecepcion[]) => ({
  status: 200,
  data: { data: datos, meta: { current_page: 1, last_page: 1, total: datos.length } },
});

function backend(
  opciones: {
    pendientes?: DetalleRecepcion[];
    alRecibir?: (config: InternalAxiosRequestConfig) => RespuestaSimulada;
  } = {},
) {
  let stock = 86;
  let pendientes = opciones.pendientes ?? [detalle(52, 'PUR-REC-001', 10)];
  return crearAdaptador((config) => {
    if (config.url === '/products/by-barcode') {
      return config.params.barcode === CODIGO
        ? { status: 200, data: { data: martillo(stock) } }
        : { status: 404, data: { message: 'El recurso solicitado no existe.' } };
    }
    if (config.url === '/purchase-receipts') return pagina(pendientes);
    if (config.url === '/products/2') return { status: 200, data: { data: martillo(stock) } };
    if (config.url?.endsWith('/receive')) {
      const respuesta = opciones.alRecibir?.(config);
      if (respuesta) return respuesta;
      const recibido = pendientes.find((d) => config.url === `/purchase-items/${d.id}/receive`)!;
      stock += recibido.quantity;
      pendientes = pendientes.filter((d) => d !== recibido);
      return { status: 200, data: { data: { ...recibido, received_at: '2026-11-08T05:00:00.000000Z' } } };
    }
    return { status: 500, data: { message: 'Ruta no simulada' } };
  });
}

beforeEach(() => {
  setActivePinia(createPinia());
  reiniciarSimuladores();
});

describe('búsqueda por código escaneado', () => {
  test('consulta el producto y sus compras pendientes con el código exacto; si hay una sola, la elige', async () => {
    const { adaptador, solicitudes } = backend();
    api.defaults.adapter = adaptador;
    const recepcion = useRecepcionStore();

    await recepcion.buscar(CODIGO);

    expect(solicitudes.map((s) => s.url)).toEqual(['/products/by-barcode', '/purchase-receipts']);
    expect(solicitudes[0].params).toEqual({ barcode: CODIGO });
    expect(recepcion.producto?.cantidad_stock).toBe(86);
    expect(recepcion.pendientes).toHaveLength(1);
    expect(recepcion.seleccionado?.id).toBe(52);
  });

  test('con varias compras pendientes no elige ninguna: el bodeguero decide', async () => {
    api.defaults.adapter = backend({
      pendientes: [detalle(52, 'PUR-REC-001', 10), detalle(60, 'PUR-REC-002', 30)],
    }).adaptador;
    const recepcion = useRecepcionStore();

    await recepcion.buscar(CODIGO);

    expect(recepcion.pendientes).toHaveLength(2);
    expect(recepcion.seleccionado).toBeNull();
  });

  test('un código inexistente muestra un mensaje claro (404)', async () => {
    api.defaults.adapter = backend().adaptador;
    const recepcion = useRecepcionStore();

    await recepcion.buscar('999');

    expect(recepcion.producto).toBeNull();
    expect(recepcion.error).toBe('No existe un producto con el código de barras 999.');
  });

  test('si la recepción no está habilitada (409), muestra el producto y el error de pendientes', async () => {
    api.defaults.adapter = crearAdaptador((config) =>
      config.url === '/products/by-barcode'
        ? { status: 200, data: { data: martillo(86) } }
        : { status: 409, data: { message: 'La recepción no está habilitada: falta la fecha de inicio.' } },
    ).adaptador;
    const recepcion = useRecepcionStore();

    await recepcion.buscar(CODIGO);

    expect(recepcion.producto?.nombre).toBe('Martillo de uña 16 oz');
    expect(recepcion.errorPendientes).toMatch(/no está habilitada/);
  });

  test('sin conexión no llama a la API', async () => {
    const { adaptador, solicitudes } = backend();
    api.defaults.adapter = adaptador;
    useRedStore().conectado = false;
    const recepcion = useRecepcionStore();

    await recepcion.buscar(CODIGO);

    expect(solicitudes).toHaveLength(0);
    expect(recepcion.error).toMatch(/Sin conexión/);
  });
});

describe('confirmación de la recepción', () => {
  test('envía código y cantidad; el stock nuevo se vuelve a consultar al backend (no se suma en la app)', async () => {
    const { adaptador, solicitudes } = backend();
    api.defaults.adapter = adaptador;
    const productos = useProductosStore();
    productos.productos = [martillo(86)];
    const recepcion = useRecepcionStore();
    await recepcion.buscar(CODIGO);

    const resultado = await recepcion.confirmar(10);

    const envio = solicitudes.find((s) => s.url === '/purchase-items/52/receive');
    expect(JSON.parse(envio?.data)).toEqual({ barcode: CODIGO, quantity: 10 });
    expect(solicitudes.some((s) => s.url === '/products/2')).toBe(true);
    expect(resultado.stockAnterior).toBe(86);
    expect(resultado.producto?.cantidad_stock).toBe(96);
    expect(recepcion.producto?.cantidad_stock).toBe(96);
    expect(productos.productos[0].cantidad_stock).toBe(96);
    expect(recepcion.pendientes).toHaveLength(0);
  });

  test('un 422 del backend (cantidad distinta) se propaga con el error por campo', async () => {
    api.defaults.adapter = backend({
      alRecibir: () => ({
        status: 422,
        data: {
          message: 'Los datos enviados no son válidos.',
          errors: { quantity: ['La cantidad recibida debe coincidir exactamente con la cantidad del detalle.'] },
        },
      }),
    }).adaptador;
    const recepcion = useRecepcionStore();
    await recepcion.buscar(CODIGO);

    await expect(recepcion.confirmar(9)).rejects.toMatchObject({
      status: 422,
      errores: { quantity: [expect.stringMatching(/coincidir exactamente/)] },
    });
    expect(recepcion.producto?.cantidad_stock).toBe(86);
  });

  test('un 409 (ya recibido por otra persona) recarga la lista de pendientes', async () => {
    let recibidoPorOtro = false;
    const { adaptador, solicitudes } = crearAdaptador((config) => {
      if (config.url === '/products/by-barcode') return { status: 200, data: { data: martillo(96) } };
      if (config.url === '/purchase-receipts') return pagina(recibidoPorOtro ? [] : [detalle(52, 'PUR-REC-001', 10)]);
      recibidoPorOtro = true;
      return { status: 409, data: { message: 'Este detalle ya fue recibido o tiene movimientos registrados.' } };
    });
    api.defaults.adapter = adaptador;
    const recepcion = useRecepcionStore();
    await recepcion.buscar(CODIGO);

    await expect(recepcion.confirmar(10)).rejects.toMatchObject({ status: 409 });

    expect(solicitudes.filter((s) => s.url === '/purchase-receipts')).toHaveLength(2);
    expect(recepcion.pendientes).toHaveLength(0);
  });
});
