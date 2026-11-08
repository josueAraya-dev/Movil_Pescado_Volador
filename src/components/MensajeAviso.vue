<template>
  <ion-card :class="['mensaje', `mensaje--${tipo}`]" :role="tipo === 'error' ? 'alert' : 'status'">
    <ion-card-content>
      <div class="mensaje-cuerpo">
        <ion-icon :icon="icono ?? ICONOS[tipo]" aria-hidden="true" />
        <ion-text class="mensaje-texto">
          <slot />
        </ion-text>
      </div>
      <div v-if="$slots.acciones" class="mensaje-acciones">
        <slot name="acciones" />
      </div>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
import { IonCard, IonCardContent, IonIcon, IonText } from '@ionic/vue';
import { alertCircleOutline, checkmarkCircleOutline, informationCircleOutline, warningOutline } from 'ionicons/icons';

export type TipoMensaje = 'error' | 'exito' | 'info' | 'advertencia';

defineProps<{
  tipo: TipoMensaje;
  icono?: string;
}>();

const ICONOS: Record<TipoMensaje, string> = {
  error: alertCircleOutline,
  exito: checkmarkCircleOutline,
  info: informationCircleOutline,
  advertencia: warningOutline,
};
</script>
