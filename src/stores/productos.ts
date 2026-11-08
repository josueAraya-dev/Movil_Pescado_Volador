import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

import { CLAVES_CACHE, guardarCache, leerCache } from '@/servicios/cache';
import { ErrorApi, MENSAJE_SIN_SERVIDOR, aErrorApi } from '@/servicios/errores';
import {
  type CuerpoProducto,
  actualizarProducto,
  crearProducto,
  eliminarProducto,
  listarCategorias,
  listarMarcas,
  listarProductos,
  listarUnidades,
  obtenerProducto,
} from '@/servicios/productosApi';
import { useRedStore } from '@/stores/red';
import { useSesionStore } from '@/stores/sesion';
import type { ElementoCatalogo, Producto } from '@/types/modelos';

const POR_PAGINA = 15;

export type OrigenCache = 'sin-conexion' | 'sin-servidor';

export type ClaveCatalogo = 'categorias' | 'marcas' | 'unidades';

const PERMISOS_CATALOGO: Record<ClaveCatalogo, string> = {
  categorias: 'view categories',
  marcas: 'view brands',
  unidades: 'view units',
};

export function filtrarProductos(lista: Producto[], texto: string): Producto[] {
  const q = texto.trim().toLowerCase();
  if (q === '') return lista;
  return lista.filter(
    (p) =>
      p.nombre.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.codigo_barras ?? '').toLowerCase().includes(q),
  );
}

export const useProductosStore = defineStore('productos', () => {
  const red = useRedStore();
  const sesion = useSesionStore();

  const productos = ref<Producto[]>([]);
  const busqueda = ref('');
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

  // Descarta respuestas viejas (por ejemplo, de una búsqueda anterior).
  let solicitudActual = 0;

  async function guardarEnCache() {
    if (busqueda.value === '' && !desdeCache.value) {
      await guardarCache(CLAVES_CACHE.productos, productos.value);
    }
  }

  async function usarCache(origen: OrigenCache) {
    const entrada = await leerCache<Producto[]>(CLAVES_CACHE.productos);
    if (!entrada) {
      productos.value = [];
      desdeCache.value = false;
      error.value =
        origen === 'sin-conexion'
          ? 'Sin conexión y todavía no hay datos guardados en este dispositivo.'
          : `${MENSAJE_SIN_SERVIDOR} Tampoco hay datos guardados en este dispositivo.`;
      return;
    }
    productos.value = filtrarProductos(entrada.datos, busqueda.value);
    desdeCache.value = true;
    guardadoEn.value = entrada.guardadoEn;
    origenCache.value = origen;
    error.value = null;
  }

  async function cargar(texto = busqueda.value) {
    const solicitud = ++solicitudActual;
    busqueda.value = texto.trim();
    cargando.value = true;
    error.value = null;
    necesitaRecarga.value = false;

    try {
      if (!red.conectado) {
        await usarCache('sin-conexion');
        return;
      }
      const resultado = await listarProductos({ q: busqueda.value, pagina: 1, porPagina: POR_PAGINA });
      if (solicitud !== solicitudActual) return;
      productos.value = resultado.datos;
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
    const resultado = await listarProductos({ q: busqueda.value, pagina: pagina.value + 1, porPagina: POR_PAGINA });
    if (solicitud !== solicitudActual) return;
    const existentes = new Set(productos.value.map((p) => p.id));
    productos.value.push(...resultado.datos.filter((p) => !existentes.has(p.id)));
    pagina.value = resultado.paginaActual;
    ultimaPagina.value = resultado.ultimaPagina;
    total.value = resultado.total;
    await guardarEnCache();
  }

  async function obtener(id: number): Promise<{ producto: Producto; desdeCache: boolean; guardadoEn: string | null }> {
    if (red.conectado) {
      try {
        return { producto: await obtenerProducto(id), desdeCache: false, guardadoEn: null };
      } catch (e) {
        const err = aErrorApi(e);
        if (!err.esDeConexion) throw err;
      }
    }
    const entrada = await leerCache<Producto[]>(CLAVES_CACHE.productos);
    const producto = entrada?.datos.find((p) => p.id === id) ?? productos.value.find((p) => p.id === id);
    if (!producto) throw new ErrorApi(0, 'Sin conexión: este producto no está entre los datos guardados.');
    return { producto, desdeCache: true, guardadoEn: entrada?.guardadoEn ?? guardadoEn.value };
  }

  async function buscarUno(texto: string): Promise<Producto | undefined> {
    if (red.conectado) {
      try {
        return (await listarProductos({ q: texto, pagina: 1, porPagina: 1 })).datos[0];
      } catch (e) {
        if (!aErrorApi(e).esDeConexion) throw e;
      }
    }
    const entrada = await leerCache<Producto[]>(CLAVES_CACHE.productos);
    return filtrarProductos(entrada?.datos ?? [], texto)[0];
  }

  async function crear(cuerpo: CuerpoProducto): Promise<Producto> {
    const producto = await crearProducto(cuerpo);
    necesitaRecarga.value = true;
    return producto;
  }

  async function actualizar(id: number, cuerpo: CuerpoProducto): Promise<Producto> {
    const producto = await actualizarProducto(id, cuerpo);
    productos.value = productos.value.map((p) => (p.id === id ? producto : p));
    await guardarEnCache();
    return producto;
  }

  async function eliminar(id: number): Promise<void> {
    await eliminarProducto(id);
    productos.value = productos.value.filter((p) => p.id !== id);
    total.value = Math.max(0, total.value - 1);
    await guardarEnCache();
  }

  async function refrescarProducto(producto: Producto): Promise<void> {
    productos.value = productos.value.map((p) => (p.id === producto.id ? producto : p));
    await guardarEnCache();
  }

  const catalogos = ref<Record<ClaveCatalogo, ElementoCatalogo[]>>({ categorias: [], marcas: [], unidades: [] });
  const erroresCatalogo = ref<Record<ClaveCatalogo, string | null>>({ categorias: null, marcas: null, unidades: null });
  const cargandoCatalogos = ref(false);
  let catalogosCargados = false;

  // La falta de permiso no se arregla reintentando: se excluye.
  const errorCatalogos = computed(
    () =>
      (Object.keys(PERMISOS_CATALOGO) as ClaveCatalogo[])
        .filter((clave) => sesion.puede(PERMISOS_CATALOGO[clave]))
        .map((clave) => erroresCatalogo.value[clave])
        .find((mensaje) => mensaje !== null) ?? null,
  );

  async function cargarCatalogo(
    clave: ClaveCatalogo,
    nombre: string,
    pedir: () => Promise<ElementoCatalogo[]>,
  ): Promise<boolean> {
    const permiso = PERMISOS_CATALOGO[clave];
    if (!sesion.puede(permiso)) {
      erroresCatalogo.value[clave] = `Su usuario no tiene permiso para ver ${nombre} (${permiso}).`;
      return false;
    }
    try {
      catalogos.value[clave] = await pedir();
      erroresCatalogo.value[clave] = null;
      return true;
    } catch (e) {
      erroresCatalogo.value[clave] = aErrorApi(e).message;
      return false;
    }
  }

  async function cargarCatalogos() {
    if (catalogosCargados || cargandoCatalogos.value || !red.conectado) return;
    cargandoCatalogos.value = true;
    try {
      const resultados = await Promise.all([
        cargarCatalogo('categorias', 'categorías', listarCategorias),
        cargarCatalogo('marcas', 'marcas', listarMarcas),
        cargarCatalogo('unidades', 'unidades', listarUnidades),
      ]);
      catalogosCargados = resultados.every(Boolean);
    } finally {
      cargandoCatalogos.value = false;
    }
  }

  function nombreCatalogo(clave: ClaveCatalogo, id: number): string {
    return catalogos.value[clave].find((e) => e.id === id)?.nombre ?? `#${id}`;
  }

  function reiniciar() {
    solicitudActual++;
    productos.value = [];
    busqueda.value = '';
    pagina.value = 0;
    ultimaPagina.value = 0;
    total.value = 0;
    cargando.value = false;
    cargado.value = false;
    error.value = null;
    desdeCache.value = false;
    guardadoEn.value = null;
    catalogos.value = { categorias: [], marcas: [], unidades: [] };
    erroresCatalogo.value = { categorias: null, marcas: null, unidades: null };
    cargandoCatalogos.value = false;
    catalogosCargados = false;
  }

  watch(
    () => sesion.token,
    (token) => {
      if (!token) reiniciar();
    },
  );

  // Punto 6: sin conexión se muestra la caché; al volver, se recarga de la API.
  watch(
    () => red.conectado,
    (conectado) => {
      if (!sesion.autenticado || !cargado.value) return;
      if (!conectado && !desdeCache.value) void usarCache('sin-conexion');
      else if (conectado && (desdeCache.value || error.value)) void cargar();
    },
  );

  return {
    productos,
    busqueda,
    total,
    cargando,
    cargado,
    error,
    desdeCache,
    guardadoEn,
    origenCache,
    necesitaRecarga,
    hayMas,
    catalogos,
    erroresCatalogo,
    cargandoCatalogos,
    errorCatalogos,
    cargar,
    cargarMas,
    obtener,
    buscarUno,
    crear,
    actualizar,
    eliminar,
    refrescarProducto,
    cargarCatalogos,
    nombreCatalogo,
  };
});
