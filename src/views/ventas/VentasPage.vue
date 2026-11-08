<template>
  <ion-page>
    <EncabezadoPrincipal titulo="Ventas" />

    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" @ion-refresh="recargar">
        <ion-refresher-content />
      </ion-refresher>

      <h2>Historial</h2>

      <AvisoDatosGuardados v-if="ventas.desdeCache" :guardado-en="ventas.guardadoEn" :origen="ventas.origenCache" />

      <EstadoCarga v-if="ventas.cargando && ventas.ventas.length === 0" mensaje="Cargando ventas…" />

      <EstadoError v-else-if="ventas.error" :mensaje="ventas.error" @reintentar="ventas.cargar()" />

      <EstadoVacio
        v-else-if="ventas.cargado && ventas.ventas.length === 0"
        :icono="receiptOutline"
        mensaje="No hay ventas por mostrar todavía."
        accion="Recargar"
        @accion="ventas.cargar()"
      />

      <template v-else-if="ventas.ventas.length > 0">
        <ion-text color="medium">
          <p class="resumen" role="status">{{ estado }}</p>
        </ion-text>

        <div class="grid-ventas">
          <ion-card v-for="venta in ventas.ventas" :key="venta.id" class="tarjeta">
            <ion-card-header>
              <ion-card-title>Venta #{{ venta.id }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p>{{ ventas.nombreCliente(venta.id_customer) }}</p>
              <p class="precio">{{ colones(venta.total) }}</p>
              <p>
                <ion-badge :class="claseEstadoVenta(venta.status)">{{ venta.status }}</ion-badge>
              </p>
              <p class="ayuda">Fecha: {{ fechaVenta(venta.sale_date) }}</p>
              <div v-if="sesion.puede('update sales')" class="tarjeta-pie">
                <ion-button :disabled="!red.conectado" :router-link="`/tabs/ventas/${venta.id}/editar`">
                  Editar
                </ion-button>
              </div>
            </ion-card-content>
          </ion-card>
        </div>
      </template>

      <EstadoError
        v-if="errorMas"
        :mensaje="`No se pudieron cargar más ventas. ${errorMas}`"
        :deshabilitado="cargandoMas"
        @reintentar="reintentarMas"
      />

      <ion-infinite-scroll :disabled="!ventas.hayMas || errorMas !== null" @ion-infinite="cargarMas">
        <ion-infinite-scroll-content loading-text="Cargando más ventas…" />
      </ion-infinite-scroll>

      <div style="height: 5rem" aria-hidden="true" />

      <ion-fab v-if="sesion.puede('create sales') && red.conectado" slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button router-link="/tabs/ventas/nueva" aria-label="Nueva venta">
          <ion-icon :icon="add" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  type InfiniteScrollCustomEvent,
  type RefresherCustomEvent,
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonText,
  onIonViewWillEnter,
} from '@ionic/vue';
import { add, receiptOutline } from 'ionicons/icons';
import { computed, ref, watch } from 'vue';

import AvisoDatosGuardados from '@/components/AvisoDatosGuardados.vue';
import EncabezadoPrincipal from '@/components/EncabezadoPrincipal.vue';
import EstadoCarga from '@/components/EstadoCarga.vue';
import EstadoError from '@/components/EstadoError.vue';
import EstadoVacio from '@/components/EstadoVacio.vue';
import { aErrorApi } from '@/servicios/errores';
import { useRedStore } from '@/stores/red';
import { useSesionStore } from '@/stores/sesion';
import { useVentasStore } from '@/stores/ventas';
import { claseEstadoVenta, colones, fechaVenta } from '@/utils/formato';

const ventas = useVentasStore();
const sesion = useSesionStore();
const red = useRedStore();

const errorMas = ref<string | null>(null);
const cargandoMas = ref(false);

onIonViewWillEnter(() => {
  if (!ventas.cargado || ventas.necesitaRecarga) void ventas.cargar();
});

watch(
  () => ventas.cargando,
  (cargando) => {
    if (cargando) errorMas.value = null;
  },
);

async function recargar(evento: RefresherCustomEvent) {
  await ventas.cargar();
  await evento.target.complete();
}

async function pedirSiguiente(): Promise<void> {
  cargandoMas.value = true;
  try {
    await ventas.cargarMas();
    errorMas.value = null;
  } catch (error) {
    const err = aErrorApi(error);
    if (err.status !== 401) errorMas.value = err.message;
  } finally {
    cargandoMas.value = false;
  }
}

async function cargarMas(evento: InfiniteScrollCustomEvent) {
  await pedirSiguiente();
  await evento.target.complete();
}

async function reintentarMas() {
  await pedirSiguiente();
}

const estado = computed(() => {
  const cantidad = ventas.ventas.length;
  return ventas.desdeCache ? `${cantidad} ventas guardadas.` : `${cantidad} de ${ventas.total} ventas cargadas.`;
});
</script>
