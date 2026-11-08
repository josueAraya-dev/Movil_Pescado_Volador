<template>
  <MensajeAviso tipo="error">
    {{ mensaje }}
    <template v-if="!sinReintento || $slots.acciones" #acciones>
      <ion-button v-if="!sinReintento" size="small" :disabled="deshabilitado" @click="emit('reintentar')">
        <ion-icon slot="start" :icon="refreshOutline" aria-hidden="true" />
        Reintentar
      </ion-button>
      <slot name="acciones" />
    </template>
  </MensajeAviso>
</template>

<script setup lang="ts">
import { IonButton, IonIcon } from '@ionic/vue';
import { refreshOutline } from 'ionicons/icons';

import MensajeAviso from './MensajeAviso.vue';

// Punto 8: estado de error con botón Reintentar.
defineProps<{
  mensaje: string;
  deshabilitado?: boolean;
  sinReintento?: boolean;
}>();

const emit = defineEmits<{ reintentar: [] }>();
</script>
