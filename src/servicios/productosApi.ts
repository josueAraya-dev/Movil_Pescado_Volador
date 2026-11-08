// Punto 4: consumo de la API de productos y sus catálogos.
import { api } from './api';
import { ErrorApi, aErrorApi } from './errores';

import type { ElementoCatalogo, ErroresCampo, Pagina, Producto } from '@/types/modelos';

export interface RespuestaPaginada<T> {
  data: T[];
  meta: { current_page: number; last_page: number; total: number };
}

export interface CuerpoProducto {
  id_categoria: number | null;
  id_marca: number | null;
  id_unidad: number | null;
  nombre: string;
  descripcion: string | null;
  sku: string;
  codigo_barras: string | null;
  precio: number | null;
  tasa_impuesto: number | null;
  cantidad_stock: number | null;
  stock_minimo: number | null;
  stock_maximo: number | null;
  peso: number | null;
  esta_activo: boolean;
}

export type ProductoApi = Omit<Producto, 'peso' | 'precio'> & { peso: string | number | null; precio: string | number };

export function aProducto(p: ProductoApi): Producto {
  return {
    ...p,
    precio: Number(p.precio),
    tasa_impuesto: Number(p.tasa_impuesto),
    cantidad_stock: Number(p.cantidad_stock),
    stock_minimo: Number(p.stock_minimo),
    stock_maximo: p.stock_maximo === null ? null : Number(p.stock_maximo),
    peso: p.peso === null ? null : Number(p.peso),
    esta_activo: Boolean(p.esta_activo),
  };
}

export const CAMPOS_PRODUCTO: Record<string, keyof CuerpoProducto> = {
  category_id: 'id_categoria',
  brand_id: 'id_marca',
  unit_id: 'id_unidad',
  name: 'nombre',
  description: 'descripcion',
  sku: 'sku',
  barcode: 'codigo_barras',
  price: 'precio',
  tax_rate: 'tasa_impuesto',
  stock_quantity: 'cantidad_stock',
  minimum_stock: 'stock_minimo',
  maximum_stock: 'stock_maximo',
  weight: 'peso',
  is_active: 'esta_activo',
};

export function aCuerpoApi(c: CuerpoProducto): Record<string, unknown> {
  const cuerpo: Record<string, unknown> = {
    category_id: c.id_categoria,
    brand_id: c.id_marca,
    unit_id: c.id_unidad,
    name: c.nombre.trim(),
    description: c.descripcion,
    sku: c.sku.trim(),
    barcode: c.codigo_barras,
    price: c.precio,
    stock_quantity: c.cantidad_stock,
    maximum_stock: c.stock_maximo,
    weight: c.peso,
    is_active: c.esta_activo,
  };
  // tax_rate y minimum_stock no aceptan null: si van vacíos se omiten.
  if (c.tasa_impuesto !== null) cuerpo.tax_rate = c.tasa_impuesto;
  if (c.stock_minimo !== null) cuerpo.minimum_stock = c.stock_minimo;
  return cuerpo;
}

export function traducirErrores(errores: ErroresCampo): ErroresCampo {
  return Object.fromEntries(
    Object.entries(errores).map(([campo, mensajes]) => [CAMPOS_PRODUCTO[campo] ?? campo, mensajes]),
  );
}

async function conErroresTraducidos<T>(operacion: () => Promise<T>): Promise<T> {
  try {
    return await operacion();
  } catch (error) {
    const e = aErrorApi(error);
    if (e.status === 422) throw new ErrorApi(422, e.message, traducirErrores(e.errores));
    throw e;
  }
}

export async function listarProductos(opciones: {
  q?: string;
  pagina: number;
  porPagina: number;
}): Promise<Pagina<Producto>> {
  const { data } = await api.get<RespuestaPaginada<ProductoApi>>('/products', {
    params: { q: opciones.q || undefined, page: opciones.pagina, per_page: opciones.porPagina },
  });
  return {
    datos: data.data.map(aProducto),
    paginaActual: data.meta.current_page,
    ultimaPagina: data.meta.last_page,
    total: data.meta.total,
  };
}

export async function obtenerProducto(id: number): Promise<Producto> {
  const { data } = await api.get<{ data: ProductoApi }>(`/products/${id}`);
  return aProducto(data.data);
}

export function crearProducto(cuerpo: CuerpoProducto): Promise<Producto> {
  return conErroresTraducidos(async () => {
    const { data } = await api.post<{ data: ProductoApi }>('/products', aCuerpoApi(cuerpo));
    return aProducto(data.data);
  });
}

export function actualizarProducto(id: number, cuerpo: CuerpoProducto): Promise<Producto> {
  return conErroresTraducidos(async () => {
    const { data } = await api.put<{ data: ProductoApi }>(`/products/${id}`, aCuerpoApi(cuerpo));
    return aProducto(data.data);
  });
}

export async function eliminarProducto(id: number): Promise<void> {
  await api.delete(`/products/${id}`);
}

async function listarCatalogo(ruta: string, claveId: string): Promise<ElementoCatalogo[]> {
  const { data } = await api.get<{ data: Record<string, unknown>[] }>(ruta, { params: { per_page: 50 } });
  return data.data.map((fila) => ({ id: Number(fila[claveId]), nombre: String(fila.Nombre ?? '') }));
}

export const listarCategorias = (): Promise<ElementoCatalogo[]> => listarCatalogo('/categories', 'ID Categoria');
export const listarMarcas = (): Promise<ElementoCatalogo[]> => listarCatalogo('/brands', 'ID Marca');
export const listarUnidades = (): Promise<ElementoCatalogo[]> => listarCatalogo('/units', 'ID Unidad de Medida');
