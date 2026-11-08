<template>
  <div class="estado-carga" role="status" aria-live="polite">
    <ion-spinner name="crescent" />
    <ion-text color="medium">{{ mensaje }}</ion-text>
  </div>
</template>

<script setup lang="ts">
import { IonSpinner, IonText } from '@ionic/vue';

defineProps<{ mensaje: string }>();
</script>
