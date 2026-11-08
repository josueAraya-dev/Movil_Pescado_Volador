import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ValoresVenta = Record<string, string>;

export const useBorradorVentaStore = defineStore('borradorVenta', () => {
  const ruta = ref<string | null>(null);
  const valores = ref<ValoresVenta | null>(null);

  function guardar(rutaFormulario: string, nuevos: ValoresVenta) {
    ruta.value = rutaFormulario;
    valores.value = { ...nuevos };
  }

  function tomar(rutaFormulario: string): ValoresVenta | null {
    if (ruta.value !== rutaFormulario || !valores.value) return null;
    const previos = valores.value;
    limpiar();
    return previos;
  }

  function limpiar() {
    ruta.value = null;
    valores.value = null;
  }

  return { ruta, valores, guardar, tomar, limpiar };
});
