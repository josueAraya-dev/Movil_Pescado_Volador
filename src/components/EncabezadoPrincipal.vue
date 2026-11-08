<template>
  <ion-header class="encabezado-marca">
    <ion-toolbar class="barra-marca">
      <ion-title>{{ titulo }}</ion-title>
      <ion-buttons slot="end">
        <ion-button :aria-label="tema.oscuro ? 'Activar modo claro' : 'Activar modo oscuro'" @click="tema.alternar()">
          <ion-icon slot="icon-only" :icon="tema.oscuro ? sunnyOutline : moonOutline" />
        </ion-button>
        <ion-button aria-label="Cerrar sesión" @click="cerrarSesion">
          <ion-icon slot="icon-only" :icon="logOutOutline" />
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonHeader, IonIcon, IonTitle, IonToolbar, useIonRouter } from '@ionic/vue';
import { logOutOutline, moonOutline, sunnyOutline } from 'ionicons/icons';

import { RUTA_LOGIN } from '@/router/guardian';
import { cerrarSesionApi } from '@/servicios/authApi';
import { useRedStore } from '@/stores/red';
import { useSesionStore } from '@/stores/sesion';
import { useTemaStore } from '@/stores/tema';

defineProps<{ titulo: string }>();

const tema = useTemaStore();
const sesion = useSesionStore();
const red = useRedStore();
const ionRouter = useIonRouter();

async function cerrarSesion() {
  if (red.conectado) {
    try {
      await cerrarSesionApi();
    } catch {
      // La sesión local se cierra igual.
    }
  }
  await sesion.cerrarSesion();
  ionRouter.navigate(RUTA_LOGIN, 'root', 'replace');
}
</script>
