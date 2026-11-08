import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { borrarSesion, guardarSesion, leerSesion, type SesionGuardada } from '@/servicios/almacenSeguro';
import { limpiarCache } from '@/servicios/cache';
import { useBorradorVentaStore } from '@/stores/borradorVenta';

export function sesionVencida(expiraEn: string | null, ahora = Date.now()): boolean {
  if (!expiraEn) return false;
  const vence = new Date(expiraEn).getTime();
  return Number.isNaN(vence) || vence <= ahora;
}

export const useSesionStore = defineStore('sesion', () => {
  const token = ref<string | null>(null);
  const expiraEn = ref<string | null>(null);
  const permisos = ref<string[]>([]);
  const correo = ref<string | null>(null);
  const expiraciones = ref(0);

  const autenticado = computed(() => token.value !== null);

  function puede(permiso: string): boolean {
    return permisos.value.includes(permiso);
  }

  function aplicar(datos: SesionGuardada | null) {
    token.value = datos?.token ?? null;
    expiraEn.value = datos?.expiraEn ?? null;
    permisos.value = datos?.permisos ?? [];
    correo.value = datos?.correo ?? null;
  }

  let restauracion: Promise<void> | null = null;

  function restaurar(): Promise<void> {
    restauracion ??= (async () => {
      const guardada = await leerSesion();
      if (guardada && !sesionVencida(guardada.expiraEn)) {
        aplicar(guardada);
      } else if (guardada) {
        await borrarSesion();
        await limpiarCache();
      }
    })();
    return restauracion;
  }

  async function abrirSesion(datos: SesionGuardada) {
    await guardarSesion(datos);
    aplicar(datos);
  }

  async function limpiarTodo() {
    aplicar(null);
    await borrarSesion();
    await limpiarCache();
  }

  async function cerrarSesion() {
    useBorradorVentaStore().limpiar();
    await limpiarTodo();
  }

  async function expirarSesion() {
    if (!autenticado.value) return;
    await limpiarTodo();
    expiraciones.value += 1;
  }

  return {
    token,
    expiraEn,
    permisos,
    correo,
    expiraciones,
    autenticado,
    puede,
    restaurar,
    abrirSesion,
    cerrarSesion,
    expirarSesion,
  };
});
