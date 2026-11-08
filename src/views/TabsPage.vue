<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />
      <ion-tab-bar id="barra-pestanas" slot="bottom">
        <ion-tab-button tab="productos" href="/tabs/productos">
          <ion-icon aria-hidden="true" :icon="cubeOutline" />
          <ion-label>Productos</ion-label>
        </ion-tab-button>
        <ion-tab-button v-if="sesion.puede('view sales')" tab="ventas" href="/tabs/ventas">
          <ion-icon aria-hidden="true" :icon="receiptOutline" />
          <ion-label>Ventas</ion-label>
        </ion-tab-button>
        <ion-tab-button v-if="sesion.puede('receive purchases')" tab="recepcion" href="/tabs/recepcion">
          <ion-icon aria-hidden="true" :icon="barcodeOutline" />
          <ion-label>Recepción</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { IonIcon, IonLabel, IonPage, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from '@ionic/vue';
import { barcodeOutline, cubeOutline, receiptOutline } from 'ionicons/icons';

import { useSesionStore } from '@/stores/sesion';

const sesion = useSesionStore();
</script>
