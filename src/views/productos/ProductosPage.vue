<template>
  <ion-page>
    <EncabezadoPrincipal titulo="Productos" />

    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" @ion-refresh="recargar">
        <ion-refresher-content />
      </ion-refresher>

      <AvisoDatosGuardados
        v-if="productos.desdeCache"
        :guardado-en="productos.guardadoEn"
        :origen="productos.origenCache"
      />

      <ion-searchbar
        :value="productos.busqueda"
        :debounce="300"
        placeholder="Buscar por nombre o SKU"
        aria-label="Buscar por nombre o SKU"
        class="buscador"
        @ion-input="buscar"
      />
      <p class="ayuda">Ej. martillo, SKU-MART-016-001</p>

      <EstadoCarga v-if="productos.cargando && productos.productos.length === 0" mensaje="Cargando productos…" />

      <EstadoError v-else-if="productos.error" :mensaje="productos.error" @reintentar="productos.cargar()" />

      <EstadoVacio
        v-else-if="productos.cargado && productos.productos.length === 0"
        :icono="productos.busqueda ? searchOutline : cubeOutline"
        :mensaje="
          productos.busqueda
            ? `No se encontraron productos para “${productos.busqueda}”.`
            : 'No hay productos por mostrar todavía.'
        "
        :accion="productos.busqueda ? 'Limpiar búsqueda' : 'Recargar'"
        @accion="productos.cargar('')"
      />

      <template v-else-if="productos.productos.length > 0">
        <ion-text color="medium">
          <p class="resumen" role="status">{{ estado }}</p>
        </ion-text>

        <div class="grid-productos">
          <ion-card
            v-for="producto in productos.productos"
            :key="producto.id"
            class="tarjeta"
            button
            :router-link="`/tabs/productos/${producto.id}`"
          >
            <ion-card-header>
              <ion-card-title>{{ producto.nombre }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p>{{ producto.sku }} · {{ colones(producto.precio) }}</p>
              <p v-if="producto.descripcion" class="ayuda">{{ producto.descripcion }}</p>
            </ion-card-content>
          </ion-card>
        </div>
      </template>

      <EstadoError
        v-if="errorMas"
        :mensaje="`No se pudieron cargar más productos. ${errorMas}`"
        :deshabilitado="cargandoMas"
        @reintentar="reintentarMas"
      />

      <ion-infinite-scroll :disabled="!productos.hayMas || errorMas !== null" @ion-infinite="cargarMas">
        <ion-infinite-scroll-content loading-text="Cargando más productos…" />
      </ion-infinite-scroll>

      <div style="height: 5rem" aria-hidden="true" />

      <ion-fab v-if="sesion.puede('create products') && red.conectado" slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button router-link="/tabs/productos/nuevo" aria-label="Nuevo producto">
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
  type SearchbarInputEventDetail,
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
  IonSearchbar,
  IonText,
  onIonViewWillEnter,
} from '@ionic/vue';
import { add, cubeOutline, searchOutline } from 'ionicons/icons';
import { computed, ref, watch } from 'vue';

import AvisoDatosGuardados from '@/components/AvisoDatosGuardados.vue';
import EncabezadoPrincipal from '@/components/EncabezadoPrincipal.vue';
import EstadoCarga from '@/components/EstadoCarga.vue';
import EstadoError from '@/components/EstadoError.vue';
import EstadoVacio from '@/components/EstadoVacio.vue';
import { aErrorApi } from '@/servicios/errores';
import { useProductosStore } from '@/stores/productos';
import { useRedStore } from '@/stores/red';
import { useSesionStore } from '@/stores/sesion';
import { colones } from '@/utils/formato';

const productos = useProductosStore();
const sesion = useSesionStore();
const red = useRedStore();

const errorMas = ref<string | null>(null);
const cargandoMas = ref(false);

onIonViewWillEnter(() => {
  if (!productos.cargado || productos.necesitaRecarga) void productos.cargar();
});

watch(
  () => productos.cargando,
  (cargando) => {
    if (cargando) errorMas.value = null;
  },
);

function buscar(evento: CustomEvent<SearchbarInputEventDetail>) {
  void productos.cargar(evento.detail.value ?? '');
}

async function recargar(evento: RefresherCustomEvent) {
  await productos.cargar();
  await evento.target.complete();
}

async function pedirSiguiente(): Promise<void> {
  cargandoMas.value = true;
  try {
    await productos.cargarMas();
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
  const cantidad = productos.productos.length;
  return productos.desdeCache
    ? `${cantidad} productos guardados.`
    : `${cantidad} de ${productos.total} productos cargados.`;
});
</script>
