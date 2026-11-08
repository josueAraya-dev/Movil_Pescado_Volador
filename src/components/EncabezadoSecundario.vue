<template>
  <ion-header class="encabezado-marca">
    <ion-toolbar class="barra-marca">
      <ion-buttons slot="start">
        <ion-back-button :default-href="volverA" text=" " />
      </ion-buttons>
      <ion-title>{{ titulo }}</ion-title>
      <ion-buttons slot="end">
        <slot name="acciones" />
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
</template>

<script setup lang="ts">
import { IonBackButton, IonButtons, IonHeader, IonTitle, IonToolbar } from '@ionic/vue';

defineProps<{
  titulo: string;
  volverA: string;
}>();
</script>
