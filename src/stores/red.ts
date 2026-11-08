// Punto 6: estado de la conexión con @capacitor/network.
import { Network } from '@capacitor/network';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useRedStore = defineStore('red', () => {
  const conectado = ref(true);
  const tipo = ref<string>('unknown');
  let iniciado = false;

  async function iniciar() {
    if (iniciado) return;
    iniciado = true;

    const estado = await Network.getStatus();
    conectado.value = estado.connected;
    tipo.value = estado.connectionType;

    await Network.addListener('networkStatusChange', (cambio) => {
      conectado.value = cambio.connected;
      tipo.value = cambio.connectionType;
    });
  }

  return { conectado, tipo, iniciar };
});
