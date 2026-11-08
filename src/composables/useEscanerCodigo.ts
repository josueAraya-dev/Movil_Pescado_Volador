import { App } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { alertController, useBackButton } from '@ionic/vue';
import { onMounted, onUnmounted, ref, type Ref } from 'vue';

import {
  type EstadoPermisoCamara,
  abrirAjustesApp,
  accionSegunPermiso,
  cancelarEscaneo,
  consultarPermisoCamara,
  escanearCodigo,
  pedirPermisoCamara,
} from '@/servicios/escaner';
import { mostrarAviso } from '@/utils/navegacion';

const PRIORIDAD_ATRAS = 150;

export interface EscanerCodigo {
  estado: Ref<EstadoPermisoCamara>;
  escaneando: Ref<boolean>;
  escanear: () => Promise<void>;
  cancelar: () => Promise<void>;
  abrirAjustes: () => Promise<void>;
  actualizarEstado: () => Promise<void>;
}

// Punto 7: pide el permiso de cámara en tiempo de ejecución.
export function useEscanerCodigo(alLeer: (codigo: string) => void, usarManual: () => void): EscanerCodigo {
  const estado = ref<EstadoPermisoCamara>('sin-preguntar');
  const escaneando = ref(false);

  async function actualizarEstado(): Promise<void> {
    try {
      estado.value = await consultarPermisoCamara();
    } catch {
      estado.value = 'no-disponible';
    }
  }

  async function explicarPermiso(): Promise<boolean> {
    const alerta = await alertController.create({
      header: 'Permiso de cámara',
      message:
        'La cámara se usa solo para leer el código de barras de la etiqueta del producto. ' +
        'Si no lo permite, puede escribir el código manualmente.',
      buttons: [
        { text: 'Ahora no', role: 'cancel' },
        { text: 'Permitir', role: 'confirm' },
      ],
    });
    await alerta.present();
    return (await alerta.onDidDismiss()).role === 'confirm';
  }

  async function abrirAjustes(): Promise<void> {
    try {
      await abrirAjustesApp();
    } catch {
      await mostrarAviso(
        'No se pudieron abrir los ajustes. Ábralos desde Android: Aplicaciones → Pescado Volador.',
        'danger',
      );
    }
    await actualizarEstado();
  }

  // Denegado de forma permanente: solo se puede activar desde Ajustes.
  async function avisarPermisoBloqueado(): Promise<void> {
    const alerta = await alertController.create({
      header: 'Cámara bloqueada',
      message:
        'El permiso de cámara fue denegado y Android ya no vuelve a preguntarlo. ' +
        'Para escanear, abra Ajustes → Permisos → Cámara y elija «Permitir». Mientras tanto puede escribir el código.',
      buttons: [
        { text: 'Escribir el código', role: 'cancel' },
        { text: 'Abrir ajustes', role: 'confirm' },
      ],
    });
    await alerta.present();
    const { role } = await alerta.onDidDismiss();
    if (role === 'confirm') await abrirAjustes();
    else usarManual();
  }

  async function asegurarPermiso(): Promise<boolean> {
    await actualizarEstado();
    switch (accionSegunPermiso(estado.value)) {
      case 'escanear':
        return true;
      case 'solo-manual':
        usarManual();
        return false;
      case 'ir-a-ajustes':
        await avisarPermisoBloqueado();
        return false;
      case 'explicar-y-pedir':
        if (!(await explicarPermiso())) {
          usarManual();
          return false;
        }
        break;
      case 'pedir':
        break;
    }

    estado.value = await pedirPermisoCamara();
    if (estado.value === 'concedido') return true;
    await mostrarAviso('Sin permiso de cámara. Puede escribir el código de barras.', 'medium');
    usarManual();
    return false;
  }

  async function escanear(): Promise<void> {
    if (escaneando.value) return;
    try {
      if (!(await asegurarPermiso())) return;
    } catch {
      await mostrarAviso('No se pudo consultar el permiso de cámara.', 'danger');
      return;
    }

    escaneando.value = true;
    try {
      const codigo = await escanearCodigo();
      if (codigo !== null) alLeer(codigo);
    } catch (e) {
      const detalle = e instanceof Error && e.message ? ` (${e.message})` : '';
      await mostrarAviso(`No se pudo usar la cámara${detalle}. Puede escribir el código.`, 'danger');
      await actualizarEstado();
    } finally {
      escaneando.value = false;
    }
  }

  async function cancelar(): Promise<void> {
    await cancelarEscaneo();
  }

  // Con la cámara abierta, el botón atrás solo la cierra.
  useBackButton(PRIORIDAD_ATRAS, (siguiente) => {
    if (escaneando.value) void cancelar();
    else siguiente();
  });

  const oyentes: PluginListenerHandle[] = [];
  onMounted(async () => {
    await actualizarEstado();
    if (Capacitor.isNativePlatform()) {
      oyentes.push(
        await App.addListener('resume', () => void actualizarEstado()),
        await App.addListener('pause', () => void cancelar()),
      );
    }
  });
  onUnmounted(() => {
    oyentes.forEach((o) => void o.remove());
    void cancelar();
  });

  return { estado, escaneando, escanear, cancelar, abrirAjustes, actualizarEstado };
}
