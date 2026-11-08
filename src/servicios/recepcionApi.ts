import { api } from './api';
import { aProducto, type ProductoApi, type RespuestaPaginada } from './productosApi';

import type { DetalleRecepcion, Producto } from '@/types/modelos';

const MAXIMO_POR_PAGINA = 50;

export async function buscarProductoPorCodigo(codigo: string): Promise<Producto> {
  const { data } = await api.get<{ data: ProductoApi }>('/products/by-barcode', { params: { barcode: codigo } });
  return aProducto(data.data);
}

export async function listarRecepcionesPendientes(codigo: string): Promise<DetalleRecepcion[]> {
  const { data } = await api.get<RespuestaPaginada<DetalleRecepcion>>('/purchase-receipts', {
    params: { barcode: codigo, per_page: MAXIMO_POR_PAGINA },
  });
  return data.data;
}

export async function recibirDetalle(idDetalle: number, codigo: string, cantidad: number): Promise<DetalleRecepcion> {
  const { data } = await api.post<{ data: DetalleRecepcion }>(`/purchase-items/${idDetalle}/receive`, {
    barcode: codigo,
    quantity: cantidad,
  });
  return data.data;
}
