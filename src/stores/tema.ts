import { Preferences } from '@capacitor/preferences';
import { defineStore } from 'pinia';
import { ref } from 'vue';

const CLAVE_TEMA = 'tema';

export const useTemaStore = defineStore('tema', () => {
  const oscuro = ref(false);

  function aplicar() {
    document.documentElement.classList.toggle('ion-palette-dark', oscuro.value);
  }

  async function cargar() {
    const { value } = await Preferences.get({ key: CLAVE_TEMA });
    oscuro.value = value === 'oscuro';
    aplicar();
  }

  async function alternar() {
    oscuro.value = !oscuro.value;
    aplicar();
    await Preferences.set({ key: CLAVE_TEMA, value: oscuro.value ? 'oscuro' : 'claro' });
  }

  return { oscuro, cargar, alternar };
});
