<template>
  <MensajeAviso class="aviso-cache" tipo="advertencia" :icono="cloudOfflineOutline">
    <strong>{{ origen === 'sin-conexion' ? 'Sin conexión.' : 'No se pudo conectar con el servidor.' }}</strong>
    La información no está actualizada (datos guardados el {{ fechaHora(guardadoEn) }})
  </MensajeAviso>
</template>

<script setup lang="ts">
import { cloudOfflineOutline } from 'ionicons/icons';

import MensajeAviso from './MensajeAviso.vue';

import type { OrigenCache } from '@/stores/productos';
import { fechaHora } from '@/utils/formato';

// Punto 6: aviso de datos no actualizados con su marca de tiempo.
defineProps<{
  guardadoEn: string | null;
  origen: OrigenCache;
}>();
</script>
