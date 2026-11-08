import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

import { CLAVES_CACHE, guardarCache, leerCache } from '@/servicios/cache';
import { ErrorApi, MENSAJE_SIN_SERVIDOR, aErrorApi } from '@/servicios/errores';
import {
  type CuerpoVenta,
  actualizarVenta,
  crearVenta,
  listarClientes,
  listarVentas,
  obtenerVenta,
} from '@/servicios/ventasApi';
import type { OrigenCache } from '@/stores/productos';
import { useRedStore } from '@/stores/red';
import { useSesionStore } from '@/stores/sesion';
import type { Cliente, EstadoVenta, Venta } from '@/types/modelos';
import { nombreCliente as nombreDeCliente } from '@/utils/formato';

const POR_PAGINA = 10;

export const ESTADOS_VENTA: EstadoVenta[] = ['completado', 'pendiente', 'cancelado'];

interface CacheVentas {
  ventas: Venta[];
  clientes: Cliente[];
}

export const useVentasStore = defineStore('ventas', () => {
  const red = useRedStore();
  const sesion = useSesionStore();

  const ventas = ref<Venta[]>([]);
  const clientes = ref<Cliente[]>([]);
  const errorClientes = ref<string | null>(null);
  const cargandoClientes = ref(false);
  const pagina = ref(0);
  const ultimaPagina = ref(0);
  const total = ref(0);
  const cargando = ref(false);
  const cargado = ref(false);
  const error = ref<string | null>(null);
  const desdeCache = ref(false);
  const guardadoEn = ref<string | null>(null);
  const origenCache = ref<OrigenCache>('sin-conexion');
  const necesitaRecarga = ref(false);

  const hayMas = computed(() => !desdeCache.value && pagina.value < ultimaPagina.value);

  let solicitudActual = 0;

  async function guardarEnCache() {
    if (!desdeCache.value) {
      await guardarCache<CacheVentas>(CLAVES_CACHE.ventas, { ventas: ventas.value, clientes: clientes.value });
    }
  }

  async function usarCache(origen: OrigenCache) {
    const entrada = await leerCache<CacheVentas>(CLAVES_CACHE.ventas);
    if (!entrada) {
      ventas.value = [];
      desdeCache.value = false;
      error.value =
        origen === 'sin-conexion'
          ? 'Sin conexión y todavía no hay datos guardados en este dispositivo.'
          : `${MENSAJE_SIN_SERVIDOR} Tampoco hay datos guardados en este dispositivo.`;
      return;
    }
    ventas.value = entrada.datos.ventas;
    if (clientes.value.length === 0) clientes.value = entrada.datos.clientes;
    desdeCache.value = true;
    guardadoEn.value = entrada.guardadoEn;
    origenCache.value = origen;
    error.value = null;
  }

  async function cargarClientes() {
    if (!sesion.puede('view customers')) {
      errorClientes.value = 'Su usuario no tiene permiso para ver clientes (view customers).';
      return;
    }
    cargandoClientes.value = true;
    try {
      clientes.value = await listarClientes();
      errorClientes.value = null;
    } catch (e) {
      const err = aErrorApi(e);
      if (err.esDeConexion) {
        const entrada = await leerCache<CacheVentas>(CLAVES_CACHE.ventas);
        if (entrada) clientes.value = entrada.datos.clientes;
      }
      errorClientes.value = err.message;
    } finally {
      cargandoClientes.value = false;
    }
  }

  async function cargar() {
    const solicitud = ++solicitudActual;
    cargando.value = true;
    error.value = null;
    necesitaRecarga.value = false;

    try {
      if (!red.conectado) {
        await usarCache('sin-conexion');
        return;
      }
      const [resultado] = await Promise.all([listarVentas({ pagina: 1, porPagina: POR_PAGINA }), cargarClientes()]);
      if (solicitud !== solicitudActual) return;
      ventas.value = resultado.datos;
      pagina.value = resultado.paginaActual;
      ultimaPagina.value = resultado.ultimaPagina;
      total.value = resultado.total;
      desdeCache.value = false;
      guardadoEn.value = null;
      await guardarEnCache();
    } catch (e) {
      if (solicitud !== solicitudActual) return;
      const err = aErrorApi(e);
      if (err.esDeConexion) await usarCache('sin-servidor');
      else if (err.status !== 401) error.value = err.message;
    } finally {
      if (solicitud === solicitudActual) {
        cargando.value = false;
        cargado.value = true;
      }
    }
  }

  async function cargarMas() {
    if (!hayMas.value || cargando.value) return;
    const solicitud = solicitudActual;
    const resultado = await listarVentas({ pagina: pagina.value + 1, porPagina: POR_PAGINA });
    if (solicitud !== solicitudActual) return;
    const existentes = new Set(ventas.value.map((v) => v.id));
    ventas.value.push(...resultado.datos.filter((v) => !existentes.has(v.id)));
    pagina.value = resultado.paginaActual;
    ultimaPagina.value = resultado.ultimaPagina;
    total.value = resultado.total;
    await guardarEnCache();
  }

  async function obtener(id: number): Promise<{ venta: Venta; desdeCache: boolean; guardadoEn: string | null }> {
    if (red.conectado) {
      try {
        return { venta: await obtenerVenta(id), desdeCache: false, guardadoEn: null };
      } catch (e) {
        const err = aErrorApi(e);
        if (!err.esDeConexion) throw err;
      }
    }
    const entrada = await leerCache<CacheVentas>(CLAVES_CACHE.ventas);
    const venta = entrada?.datos.ventas.find((v) => v.id === id) ?? ventas.value.find((v) => v.id === id);
    if (!venta) throw new ErrorApi(0, 'Sin conexión: esta venta no está entre los datos guardados.');
    return { venta, desdeCache: true, guardadoEn: entrada?.guardadoEn ?? guardadoEn.value };
  }

  async function crear(cuerpo: CuerpoVenta): Promise<Venta> {
    const venta = await crearVenta(cuerpo);
    necesitaRecarga.value = true;
    return venta;
  }

  async function actualizar(id: number, cuerpo: CuerpoVenta): Promise<Venta> {
    const venta = await actualizarVenta(id, cuerpo);
    ventas.value = ventas.value.map((v) => (v.id === id ? venta : v));
    await guardarEnCache();
    return venta;
  }

  function nombreCliente(id: string | null): string {
    return nombreDeCliente(clientes.value, id);
  }

  function reiniciar() {
    solicitudActual++;
    ventas.value = [];
    clientes.value = [];
    errorClientes.value = null;
    cargandoClientes.value = false;
    pagina.value = 0;
    ultimaPagina.value = 0;
    total.value = 0;
    cargando.value = false;
    cargado.value = false;
    error.value = null;
    desdeCache.value = false;
    guardadoEn.value = null;
  }

  watch(
    () => sesion.token,
    (token) => {
      if (!token) reiniciar();
    },
  );

  watch(
    () => red.conectado,
    (conectado) => {
      if (!sesion.autenticado || !cargado.value) return;
      if (!conectado && !desdeCache.value) void usarCache('sin-conexion');
      else if (conectado && (desdeCache.value || error.value)) void cargar();
    },
  );

  return {
    ventas,
    clientes,
    errorClientes,
    cargandoClientes,
    total,
    cargando,
    cargado,
    error,
    desdeCache,
    guardadoEn,
    origenCache,
    necesitaRecarga,
    hayMas,
    cargar,
    cargarMas,
    cargarClientes,
    obtener,
    crear,
    actualizar,
    nombreCliente,
  };
});
