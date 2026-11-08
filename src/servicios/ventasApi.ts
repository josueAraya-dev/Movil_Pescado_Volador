import { api } from './api';
import type { RespuestaPaginada } from './productosApi';

import type { Cliente, Pagina, Venta } from '@/types/modelos';

export interface CuerpoVenta {
  id_customer: string | null;
  sale_date: string;
  total: number | null;
  tax_amount: number;
  discount: number;
  status: string;
}

type VentaApi = Omit<Venta, 'total' | 'tax_amount' | 'discount'> & {
  total: string | number;
  tax_amount: string | number | null;
  discount: string | number | null;
};

export function aVenta(v: VentaApi): Venta {
  return {
    id: v.id,
    user_id: v.user_id,
    id_customer: v.id_customer ?? null,
    sale_date: v.sale_date,
    total: Number(v.total),
    tax_amount: Number(v.tax_amount ?? 0),
    discount: Number(v.discount ?? 0),
    status: v.status,
  };
}

export async function listarVentas(opciones: { pagina: number; porPagina: number }): Promise<Pagina<Venta>> {
  const { data } = await api.get<RespuestaPaginada<VentaApi>>('/sales', {
    params: { page: opciones.pagina, per_page: opciones.porPagina, sort: 'id', direction: 'desc' },
  });
  return {
    datos: data.data.map(aVenta),
    paginaActual: data.meta.current_page,
    ultimaPagina: data.meta.last_page,
    total: data.meta.total,
  };
}

export async function obtenerVenta(id: number): Promise<Venta> {
  const { data } = await api.get<{ data: VentaApi }>(`/sales/${id}`);
  return aVenta(data.data);
}

export async function crearVenta(cuerpo: CuerpoVenta): Promise<Venta> {
  const { data } = await api.post<{ data: VentaApi }>('/sales', cuerpo);
  return aVenta(data.data);
}

export async function actualizarVenta(id: number, cuerpo: CuerpoVenta): Promise<Venta> {
  const { data } = await api.put<{ data: VentaApi }>(`/sales/${id}`, cuerpo);
  return aVenta(data.data);
}

export async function listarClientes(): Promise<Cliente[]> {
  const { data } = await api.get<RespuestaPaginada<Cliente>>('/customers', { params: { per_page: 50 } });
  return data.data;
}
