<template>
  <Teleport to="body">
    <div v-if="visible" class="visor-escaner" role="dialog" aria-modal="true" aria-label="Escáner de código de barras">
      <p class="visor-escaner__texto">Apunte la cámara al código de barras de la etiqueta</p>
      <div class="visor-escaner__marco" aria-hidden="true" />
      <ion-button class="visor-escaner__cancelar" color="light" @click="emit('cancelar')">Cancelar</ion-button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { IonButton } from '@ionic/vue';

defineProps<{ visible: boolean }>();
const emit = defineEmits<{ cancelar: [] }>();
</script>
