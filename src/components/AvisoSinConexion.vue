<template>
  <MensajeAviso v-if="!red.conectado" class="aviso-sin-conexion" tipo="advertencia" :icono="cloudOfflineOutline">
    <strong>Sin conexión.</strong>
    {{ mensaje ?? 'No se pueden guardar cambios hasta que vuelva la conexión.' }}
  </MensajeAviso>
</template>

<script setup lang="ts">
import { cloudOfflineOutline } from 'ionicons/icons';

import MensajeAviso from './MensajeAviso.vue';

import { useRedStore } from '@/stores/red';

defineProps<{ mensaje?: string }>();

const red = useRedStore();
</script>
