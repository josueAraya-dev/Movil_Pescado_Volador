<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { App } from '@capacitor/app';
import { alertController, IonApp, IonRouterOutlet, useBackButton, useIonRouter } from '@ionic/vue';
import { watch } from 'vue';
import { useRouter } from 'vue-router';

import { RUTA_LOGIN } from '@/router/guardian';
import { useSesionStore } from '@/stores/sesion';

const ionRouter = useIonRouter();
const router = useRouter();
const sesion = useSesionStore();
let confirmando = false;

// Punto 2: en la raíz, el botón atrás pide confirmar la salida.
useBackButton(-1, async () => {
  if (ionRouter.canGoBack() || confirmando) return;

  confirmando = true;
  const alerta = await alertController.create({
    header: 'Salir',
    message: '¿Desea salir de la aplicación?',
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      { text: 'Salir', role: 'confirm', handler: () => App.exitApp() },
    ],
  });
  await alerta.present();
  await alerta.onDidDismiss();
  confirmando = false;
});

watch(
  () => sesion.expiraciones,
  () => {
    const actual = router.currentRoute.value;
    if (actual.path === RUTA_LOGIN) return;
    ionRouter.navigate(
      { path: RUTA_LOGIN, query: { redirect: actual.fullPath, motivo: 'expirada' } },
      'root',
      'replace',
    );
  },
);
</script>
