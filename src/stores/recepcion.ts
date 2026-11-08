import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

import { ErrorApi, aErrorApi } from '@/servicios/errores';
import { obtenerProducto } from '@/servicios/productosApi';
import { buscarProductoPorCodigo, listarRecepcionesPendientes, recibirDetalle } from '@/servicios/recepcionApi';
import { useProductosStore } from '@/stores/productos';
import { useRedStore } from '@/stores/red';
import { useSesionStore } from '@/stores/sesion';
import type { DetalleRecepcion, Producto } from '@/types/modelos';

export const MENSAJE_RECEPCION_SIN_CONEXION =
  'Sin conexión: para consultar el producto y sus compras pendientes se necesita conexión.';

export interface RecepcionConfirmada {
  detalle: DetalleRecepcion;
  stockAnterior: number;
  producto: Producto | null;
}

export const useRecepcionStore = defineStore('recepcion', () => {
  const red = useRedStore();
  const sesion = useSesionStore();
  const productos = useProductosStore();

  const codigo = ref('');
  const producto = ref<Producto | null>(null);
  const pendientes = ref<DetalleRecepcion[]>([]);
  const idSeleccionado = ref<number | null>(null);
  const buscando = ref(false);
  const error = ref<string | null>(null);
  const errorPendientes = ref<string | null>(null);
  const cargandoPendientes = ref(false);
  const confirmando = ref(false);

  const seleccionado = computed(() => pendientes.value.find((d) => d.id === idSeleccionado.value) ?? null);

  let solicitudActual = 0;

  async function cargarPendientes(solicitud = solicitudActual): Promise<void> {
    cargandoPendientes.value = true;
    errorPendientes.value = null;
    try {
      const lista = await listarRecepcionesPendientes(codigo.value);
      if (solicitud !== solicitudActual) return;
      pendientes.value = lista;
      if (!lista.some((d) => d.id === idSeleccionado.value)) {
        idSeleccionado.value = lista.length === 1 ? lista[0].id : null;
      }
    } catch (e) {
      if (solicitud !== solicitudActual) return;
      const err = aErrorApi(e);
      pendientes.value = [];
      idSeleccionado.value = null;
      if (err.status !== 401) errorPendientes.value = err.message;
    } finally {
      if (solicitud === solicitudActual) cargandoPendientes.value = false;
    }
  }

  async function buscar(texto: string): Promise<void> {
    const solicitud = ++solicitudActual;
    codigo.value = texto;
    producto.value = null;
    pendientes.value = [];
    idSeleccionado.value = null;
    error.value = null;
    errorPendientes.value = null;

    if (texto === '') {
      error.value = 'Escanee la etiqueta o escriba el código de barras del producto.';
      return;
    }
    if (!red.conectado) {
      error.value = MENSAJE_RECEPCION_SIN_CONEXION;
      return;
    }

    buscando.value = true;
    try {
      const encontrado = await buscarProductoPorCodigo(texto);
      if (solicitud !== solicitudActual) return;
      producto.value = encontrado;
      await cargarPendientes(solicitud);
    } catch (e) {
      if (solicitud !== solicitudActual) return;
      const err = aErrorApi(e);
      if (err.status === 404) error.value = `No existe un producto con el código de barras ${texto}.`;
      else if (err.status !== 401) error.value = err.message;
    } finally {
      if (solicitud === solicitudActual) buscando.value = false;
    }
  }

  async function reintentar(): Promise<void> {
    if (producto.value && errorPendientes.value) {
      if (!red.conectado) {
        errorPendientes.value = MENSAJE_RECEPCION_SIN_CONEXION;
        return;
      }
      await cargarPendientes();
    } else {
      await buscar(codigo.value);
    }
  }

  async function confirmar(cantidad: number): Promise<RecepcionConfirmada> {
    const detalle = seleccionado.value;
    const actual = producto.value;
    if (!detalle || !actual) throw new ErrorApi(-1, 'Seleccione el detalle de compra que va a recibir.');
    if (!red.conectado) throw new ErrorApi(0, MENSAJE_RECEPCION_SIN_CONEXION);

    confirmando.value = true;
    try {
      let recibido: DetalleRecepcion;
      try {
        recibido = await recibirDetalle(detalle.id, codigo.value, cantidad);
      } catch (e) {
        const err = aErrorApi(e);
        if (err.status === 409) await cargarPendientes();
        throw err;
      }

      let actualizado: Producto | null = null;
      try {
        // El stock lo suma el backend: se vuelve a consultar el producto.
        actualizado = await obtenerProducto(actual.id);
        producto.value = actualizado;
        await productos.refrescarProducto(actualizado);
      } catch {
        productos.necesitaRecarga = true;
      }
      idSeleccionado.value = null;
      await cargarPendientes();
      return { detalle: recibido, stockAnterior: actual.cantidad_stock, producto: actualizado };
    } finally {
      confirmando.value = false;
    }
  }

  function limpiar(): void {
    solicitudActual++;
    codigo.value = '';
    producto.value = null;
    pendientes.value = [];
    idSeleccionado.value = null;
    buscando.value = false;
    error.value = null;
    errorPendientes.value = null;
    cargandoPendientes.value = false;
    confirmando.value = false;
  }

  watch(
    () => sesion.token,
    (token) => {
      if (!token) limpiar();
    },
  );

  return {
    codigo,
    producto,
    pendientes,
    idSeleccionado,
    seleccionado,
    buscando,
    error,
    errorPendientes,
    cargandoPendientes,
    confirmando,
    buscar,
    reintentar,
    confirmar,
    limpiar,
  };
});
