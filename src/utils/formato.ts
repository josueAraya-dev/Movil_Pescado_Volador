import type { Cliente, EstadoVenta } from '@/types/modelos';

const formatoColones = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC',
  maximumFractionDigits: 0,
});

export function colones(valor: number | string | null | undefined): string {
  return formatoColones.format(Number(valor) || 0);
}

const formatoFecha = new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeZone: 'UTC' });

export function fechaVenta(valor: string | null | undefined): string {
  const iso = String(valor ?? '').slice(0, 10);
  const fecha = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(fecha.getTime()) ? 'Sin fecha' : formatoFecha.format(fecha);
}

export function hoyISO(): string {
  const fecha = new Date();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

const formatoFechaHora = new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short' });

export function fechaHora(iso: string | null | undefined): string {
  const fecha = new Date(String(iso ?? ''));
  return Number.isNaN(fecha.getTime()) ? 'fecha desconocida' : formatoFechaHora.format(fecha);
}

export function nombreCliente(clientes: Cliente[], id: string | null): string {
  if (!id) return 'Mostrador';
  const cliente = clientes.find((c) => c.id_customer === id);
  return cliente ? `${cliente.first_name} ${cliente.last_name1}`.trim() : `Cliente #${id}`;
}

export function claseEstadoVenta(estado: EstadoVenta | string): string {
  const valor = String(estado ?? '').toLowerCase();
  if (valor.startsWith('complet')) return 'badge badge-ok';
  if (valor.startsWith('pendient')) return 'badge badge-bajo';
  if (valor.startsWith('cancel')) return 'badge badge-error';
  return 'badge badge-neutro';
}

export function porcentaje(tasa: number | null | undefined): string {
  return `${Math.round((Number(tasa) || 0) * 10000) / 100} %`;
}
