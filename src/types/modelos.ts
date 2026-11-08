export interface Producto {
  id: number;
  id_categoria: number;
  id_marca: number;
  id_unidad: number;
  nombre: string;
  descripcion: string | null;
  sku: string;
  codigo_barras: string | null;
  precio: number;
  tasa_impuesto: number;
  cantidad_stock: number;
  stock_minimo: number;
  stock_maximo: number | null;
  peso: number | null;
  esta_activo: boolean;
}

export interface Venta {
  id: number;
  user_id: number;
  id_customer: string | null;
  sale_date: string;
  total: number;
  tax_amount: number;
  discount: number;
  status: string;
}

export type EstadoVenta = 'completado' | 'pendiente' | 'cancelado';

export interface Cliente {
  id_customer: string;
  first_name: string;
  second_name: string | null;
  last_name1: string;
  last_name2: string | null;
  email: string;
  telephone_number: string | null;
}

export interface DetalleRecepcion {
  id: number;
  id_purchase: string;
  product_id: number;
  nombre: string;
  barcode: string | null;
  quantity: number;
  received_at: string | null;
}

export interface ElementoCatalogo {
  id: number;
  nombre: string;
}

export interface Pagina<T> {
  datos: T[];
  paginaActual: number;
  ultimaPagina: number;
  total: number;
}

export type ErroresCampo = Record<string, string[]>;
