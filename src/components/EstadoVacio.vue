<template>
  <ion-card class="estado-vacio" role="status">
    <ion-card-content>
      <ion-icon class="estado-vacio-icono" :icon="icono ?? fileTrayOutline" aria-hidden="true" />
      <ion-text>
        <p class="estado-vacio-texto">{{ mensaje }}</p>
      </ion-text>
      <ion-button v-if="accion" size="small" fill="outline" :disabled="deshabilitado" @click="emit('accion')">
        {{ accion }}
      </ion-button>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
import { IonButton, IonCard, IonCardContent, IonIcon, IonText } from '@ionic/vue';
import { fileTrayOutline } from 'ionicons/icons';

defineProps<{
  mensaje: string;
  icono?: string;
  accion?: string;
  deshabilitado?: boolean;
}>();

const emit = defineEmits<{ accion: [] }>();
</script>
