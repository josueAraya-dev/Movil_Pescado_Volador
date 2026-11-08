<template>
  <ion-page>
    <EncabezadoSecundario titulo="Detalle del producto" volver-a="/tabs/productos">
      <template v-if="producto && sesion.puede('update products') && red.conectado" #acciones>
        <ion-button :router-link="`/tabs/productos/${producto.id}/editar`" aria-label="Editar producto">
          <ion-icon slot="icon-only" :icon="createOutline" />
        </ion-button>
      </template>
    </EncabezadoSecundario>

    <ion-content class="ion-padding">
      <div class="contenedor-medio">
        <EstadoCarga v-if="cargando && !producto" mensaje="Cargando producto…" />

        <EstadoError v-else-if="error" :mensaje="error" @reintentar="cargar">
          <template #acciones>
            <ion-button size="small" fill="outline" router-link="/tabs/productos" router-direction="back">
              Volver a productos
            </ion-button>
          </template>
        </EstadoError>

        <template v-else-if="producto">
          <AvisoDatosGuardados v-if="desdeCache" :guardado-en="guardadoEn" origen="sin-conexion" />

          <h1>{{ producto.nombre }}</h1>
          <p v-if="producto.descripcion" class="ayuda">{{ producto.descripcion }}</p>
          <p class="precio">{{ colones(producto.precio) }}</p>

          <ion-list lines="full">
            <ion-item>
              <ion-label>SKU</ion-label>
              <ion-note slot="end">{{ producto.sku }}</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>Código de barras</ion-label>
              <ion-note slot="end">{{ producto.codigo_barras ?? '—' }}</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>Tasa de impuesto</ion-label>
              <ion-note slot="end">{{ porcentaje(producto.tasa_impuesto) }}</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>Cantidad en stock</ion-label>
              <ion-note slot="end">{{ producto.cantidad_stock }}</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>Stock mínimo</ion-label>
              <ion-note slot="end">{{ producto.stock_minimo }}</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>Stock máximo</ion-label>
              <ion-note slot="end">{{ producto.stock_maximo ?? '—' }}</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>Peso</ion-label>
              <ion-note slot="end">{{ producto.peso ?? '—' }}</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>Categoría</ion-label>
              <ion-note slot="end">{{ productos.nombreCatalogo('categorias', producto.id_categoria) }}</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>Marca</ion-label>
              <ion-note slot="end">{{ productos.nombreCatalogo('marcas', producto.id_marca) }}</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>Unidad</ion-label>
              <ion-note slot="end">{{ productos.nombreCatalogo('unidades', producto.id_unidad) }}</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>Estado</ion-label>
              <ion-note slot="end">{{ producto.esta_activo ? 'Activo' : 'Inactivo' }}</ion-note>
            </ion-item>
          </ion-list>

          <AvisoSinConexion
            v-if="sesion.puede('update products') || sesion.puede('delete products')"
            class="ion-margin-top"
          />

          <div class="acciones ion-margin-top">
            <ion-button
              v-if="sesion.puede('update products')"
              :disabled="!red.conectado"
              :router-link="`/tabs/productos/${producto.id}/editar`"
            >
              Editar
            </ion-button>
            <ion-button
              v-if="sesion.puede('delete products')"
              color="danger"
              fill="outline"
              :disabled="!red.conectado || eliminando"
              @click="confirmarEliminar"
            >
              {{ eliminando ? 'Eliminando…' : 'Eliminar' }}
            </ion-button>
          </div>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  alertController,
  IonButton,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  onIonViewWillEnter,
  useIonRouter,
} from '@ionic/vue';
import { createOutline } from 'ionicons/icons';
import { ref } from 'vue';

import AvisoDatosGuardados from '@/components/AvisoDatosGuardados.vue';
import AvisoSinConexion from '@/components/AvisoSinConexion.vue';
import EncabezadoSecundario from '@/components/EncabezadoSecundario.vue';
import EstadoCarga from '@/components/EstadoCarga.vue';
import EstadoError from '@/components/EstadoError.vue';
import { aErrorApi } from '@/servicios/errores';
import { useProductosStore } from '@/stores/productos';
import { useRedStore } from '@/stores/red';
import { useSesionStore } from '@/stores/sesion';
import type { Producto } from '@/types/modelos';
import { colones, porcentaje } from '@/utils/formato';
import { mostrarAviso, volver } from '@/utils/navegacion';

const props = defineProps<{ id: string }>();

const productos = useProductosStore();
const sesion = useSesionStore();
const red = useRedStore();
const ionRouter = useIonRouter();

const producto = ref<Producto | null>(null);
const desdeCache = ref(false);
const guardadoEn = ref<string | null>(null);
const cargando = ref(false);
const error = ref<string | null>(null);
const eliminando = ref(false);

async function cargar() {
  cargando.value = true;
  error.value = null;
  try {
    const resultado = await productos.obtener(Number(props.id));
    producto.value = resultado.producto;
    desdeCache.value = resultado.desdeCache;
    guardadoEn.value = resultado.guardadoEn;
    void productos.cargarCatalogos();
  } catch (e) {
    const err = aErrorApi(e);
    if (err.status !== 401) error.value = err.message;
  } finally {
    cargando.value = false;
  }
}

onIonViewWillEnter(cargar);

async function confirmarEliminar() {
  if (!producto.value) return;
  const { id, nombre } = producto.value;

  const alerta = await alertController.create({
    header: 'Eliminar producto',
    message: `¿Desea eliminar “${nombre}”? Esta acción no se puede deshacer.`,
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      { text: 'Eliminar', role: 'destructive' },
    ],
  });
  await alerta.present();

  const { role } = await alerta.onDidDismiss();
  if (role !== 'destructive') return;

  eliminando.value = true;
  try {
    await productos.eliminar(id);
    await mostrarAviso(`Producto “${nombre}” eliminado.`);
    volver(ionRouter, '/tabs/productos');
  } catch (e) {
    const err = aErrorApi(e);
    if (err.status !== 401) await mostrarAviso(err.message, 'danger');
  } finally {
    eliminando.value = false;
  }
}
</script>
