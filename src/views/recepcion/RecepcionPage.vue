<template>
  <ion-page>
    <EncabezadoPrincipal titulo="Recepción" />

    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" :disabled="!recepcion.codigo || !red.conectado" @ion-refresh="refrescar">
        <ion-refresher-content />
      </ion-refresher>

      <div class="contenedor-medio">
        <h1>Recepción de productos</h1>
        <p class="ayuda subtitulo">Bodega · Nueva entrada de compras pendientes</p>

        <AvisoSinConexion mensaje="Para consultar el producto y recibir compras se necesita conexión." />

        <MensajeAviso
          v-if="escaner.estado.value === 'denegado-permanente'"
          class="aviso-camara"
          tipo="advertencia"
          :icono="lockClosedOutline"
        >
          <strong>Cámara bloqueada.</strong>
          El permiso fue denegado de forma permanente. Actívelo en Ajustes → Permisos → Cámara, o escriba el código.
          <template #acciones>
            <ion-button size="small" fill="outline" @click="escaner.abrirAjustes()">Abrir ajustes</ion-button>
          </template>
        </MensajeAviso>
        <MensajeAviso v-else-if="escaner.estado.value === 'denegado-una-vez'" class="aviso-camara" tipo="info">
          El permiso de cámara fue denegado. Toque «Escanear código de barras» para volver a pedirlo o escriba el
          código.
        </MensajeAviso>
        <MensajeAviso v-else-if="escaner.estado.value === 'no-disponible'" class="aviso-camara" tipo="info">
          En este dispositivo no se usa la cámara (por ejemplo, en el navegador). Escriba el código de barras; el
          escaneo está disponible en la app de Android.
        </MensajeAviso>

        <ion-button
          v-if="escaner.estado.value !== 'no-disponible'"
          expand="block"
          class="boton-escanear"
          :disabled="!red.conectado || recepcion.buscando || escaner.escaneando.value"
          @click="escaner.escanear()"
        >
          <ion-icon slot="start" :icon="barcodeOutline" aria-hidden="true" />
          Escanear código de barras
        </ion-button>

        <form class="busqueda-codigo" novalidate @submit.prevent="buscarEscrito">
          <ion-input
            ref="entradaCodigo"
            v-model="codigoEscrito"
            class="campo"
            fill="outline"
            label="Código de barras"
            label-placement="stacked"
            autocapitalize="off"
            :spellcheck="false"
            :maxlength="100"
            enterkeyhint="search"
            helper-text="Se llena al escanear; también puede escribirlo."
          />
          <ion-button type="submit" fill="outline" :disabled="!red.conectado || recepcion.buscando">Buscar</ion-button>
        </form>

        <MensajeAviso v-if="exito" tipo="exito">{{ exito }}</MensajeAviso>

        <EstadoCarga v-if="recepcion.buscando" mensaje="Buscando el producto…" />

        <EstadoError
          v-else-if="recepcion.error"
          :mensaje="recepcion.error"
          :sin-reintento="!recepcion.codigo"
          :deshabilitado="!red.conectado"
          @reintentar="recepcion.reintentar()"
        />

        <template v-else-if="recepcion.producto">
          <fieldset class="grupo-campos">
            <legend>Producto</legend>
            <ion-list lines="full" class="lista-datos">
              <ion-item>
                <ion-label>Producto</ion-label>
                <ion-note slot="end" class="dato">{{ recepcion.producto.nombre }}</ion-note>
              </ion-item>
              <ion-item>
                <ion-label>SKU</ion-label>
                <ion-note slot="end" class="dato">{{ recepcion.producto.sku }}</ion-note>
              </ion-item>
              <ion-item>
                <ion-label>Stock actual</ion-label>
                <ion-note slot="end" class="dato">{{ unidades(recepcion.producto.cantidad_stock) }}</ion-note>
              </ion-item>
            </ion-list>
          </fieldset>

          <fieldset class="grupo-campos">
            <legend>Recepción</legend>

            <EstadoCarga v-if="recepcion.cargandoPendientes" mensaje="Buscando compras pendientes…" />

            <EstadoError
              v-else-if="recepcion.errorPendientes"
              :mensaje="recepcion.errorPendientes"
              :deshabilitado="!red.conectado"
              @reintentar="recepcion.reintentar()"
            />

            <EstadoVacio
              v-else-if="recepcion.pendientes.length === 0"
              :icono="checkmarkDoneOutline"
              mensaje="Este producto no tiene compras pendientes de recibir."
              accion="Volver a consultar"
              :deshabilitado="!red.conectado"
              @accion="recepcion.reintentar()"
            />

            <template v-else>
              <ion-select
                v-model="recepcion.idSeleccionado"
                class="campo"
                fill="outline"
                label="Detalle de compra pendiente"
                label-placement="stacked"
                placeholder="Seleccione…"
                :helper-text="
                  recepcion.pendientes.length > 1
                    ? `Hay ${recepcion.pendientes.length} compras pendientes de este producto: elija la que llegó.`
                    : undefined
                "
              >
                <ion-select-option v-for="d in recepcion.pendientes" :key="d.id" :value="d.id">
                  {{ d.id_purchase }} · Detalle #{{ d.id }} · {{ d.quantity }} u.
                </ion-select-option>
              </ion-select>

              <ion-list lines="full" class="lista-datos">
                <ion-item>
                  <ion-label>Cantidad esperada</ion-label>
                  <ion-note slot="end" class="dato">
                    {{ recepcion.seleccionado ? unidades(recepcion.seleccionado.quantity) : '—' }}
                  </ion-note>
                </ion-item>
              </ion-list>

              <ion-input
                v-model="cantidadRecibida"
                :class="['campo', { 'ion-invalid ion-touched': Boolean(errorCantidad) }]"
                fill="outline"
                label="Cantidad recibida"
                label-placement="stacked"
                type="number"
                inputmode="numeric"
                min="1"
                step="1"
                :disabled="!recepcion.seleccionado"
                helper-text="Cuente las unidades que llegaron físicamente."
                :error-text="errorCantidad ?? undefined"
              />
              <MensajeAviso v-if="coincide" tipo="exito">Las cantidades coinciden.</MensajeAviso>

              <MensajeAviso v-if="erroresApi.barcode" tipo="error">{{ erroresApi.barcode[0] }}</MensajeAviso>

              <ion-button expand="block" :disabled="!puedeConfirmar" @click="confirmar">
                <ion-spinner v-if="recepcion.confirmando" slot="start" name="crescent" />
                {{ recepcion.confirmando ? 'Confirmando…' : 'Confirmar recepción' }}
              </ion-button>
            </template>
          </fieldset>
        </template>

        <EstadoVacio
          v-else-if="!recepcion.codigo"
          :icono="barcodeOutline"
          mensaje="Escanee la etiqueta del producto o escriba su código para ver las compras pendientes de recibir."
        />
      </div>
    </ion-content>

    <VisorEscaner :visible="escaner.escaneando.value" @cancelar="escaner.cancelar()" />
  </ion-page>
</template>

<script setup lang="ts">
import {
  alertController,
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  onIonViewWillEnter,
  onIonViewWillLeave,
  type RefresherCustomEvent,
} from '@ionic/vue';
import { barcodeOutline, checkmarkDoneOutline, lockClosedOutline } from 'ionicons/icons';
import { computed, ref, watch } from 'vue';

import AvisoSinConexion from '@/components/AvisoSinConexion.vue';
import EncabezadoPrincipal from '@/components/EncabezadoPrincipal.vue';
import EstadoCarga from '@/components/EstadoCarga.vue';
import EstadoError from '@/components/EstadoError.vue';
import EstadoVacio from '@/components/EstadoVacio.vue';
import MensajeAviso from '@/components/MensajeAviso.vue';
import VisorEscaner from '@/components/VisorEscaner.vue';
import { useEscanerCodigo } from '@/composables/useEscanerCodigo';
import { aErrorApi } from '@/servicios/errores';
import { useRecepcionStore } from '@/stores/recepcion';
import { useRedStore } from '@/stores/red';
import type { ErroresCampo } from '@/types/modelos';
import { mostrarAviso } from '@/utils/navegacion';

const recepcion = useRecepcionStore();
const red = useRedStore();

const entradaCodigo = ref<InstanceType<typeof IonInput> | null>(null);
const codigoEscrito = ref(recepcion.codigo);
const cantidadRecibida = ref('');
const erroresApi = ref<ErroresCampo>({});
const exito = ref<string | null>(null);

const unidades = (n: number): string => `${n} ${n === 1 ? 'unidad' : 'unidades'}`;

function buscar(codigo: string): void {
  exito.value = null;
  void recepcion.buscar(codigo);
}

function alLeer(codigo: string): void {
  codigoEscrito.value = codigo;
  buscar(codigo);
}

function buscarEscrito(): void {
  buscar(codigoEscrito.value.trim());
}

function enfocarCodigo(): void {
  void entradaCodigo.value?.$el.setFocus();
}

const escaner = useEscanerCodigo(alLeer, enfocarCodigo);

async function refrescar(evento: RefresherCustomEvent): Promise<void> {
  if (recepcion.codigo) await recepcion.buscar(recepcion.codigo);
  await evento.target.complete();
}

onIonViewWillEnter(() => void escaner.actualizarEstado());
onIonViewWillLeave(() => void escaner.cancelar());

const cantidadNumero = computed<number | null>(() => {
  const texto = String(cantidadRecibida.value ?? '').trim();
  return /^\d+$/.test(texto) && Number(texto) > 0 ? Number(texto) : null;
});

const coincide = computed(
  () => recepcion.seleccionado !== null && cantidadNumero.value === recepcion.seleccionado.quantity,
);

const errorCantidad = computed<string | null>(() => {
  if (erroresApi.value.quantity) return erroresApi.value.quantity[0];
  const texto = String(cantidadRecibida.value ?? '').trim();
  if (!recepcion.seleccionado || texto === '') return null;
  if (cantidadNumero.value === null) return 'Escriba un número entero mayor que 0.';
  if (!coincide.value) {
    return `La cantidad no coincide con la esperada (${unidades(recepcion.seleccionado.quantity)}). Revise el conteo.`;
  }
  return null;
});

const puedeConfirmar = computed(() => red.conectado && coincide.value && !recepcion.confirmando && !recepcion.buscando);

watch(
  () => recepcion.idSeleccionado,
  () => {
    cantidadRecibida.value = '';
    erroresApi.value = {};
  },
);
watch(cantidadRecibida, () => {
  erroresApi.value = {};
});

async function confirmar(): Promise<void> {
  const detalle = recepcion.seleccionado;
  const producto = recepcion.producto;
  if (!detalle || !producto || cantidadNumero.value === null || !coincide.value) return;

  const alerta = await alertController.create({
    header: 'Confirmar recepción',
    message:
      `¿Confirmar la recepción de ${unidades(detalle.quantity)} de “${producto.nombre}” ` +
      `(compra ${detalle.id_purchase})? Esta acción no se puede deshacer.`,
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      { text: 'Confirmar', role: 'confirm' },
    ],
  });
  await alerta.present();
  if ((await alerta.onDidDismiss()).role !== 'confirm') return;

  erroresApi.value = {};
  try {
    const resultado = await recepcion.confirmar(cantidadNumero.value);
    cantidadRecibida.value = '';
    exito.value = resultado.producto
      ? `Recepción confirmada: ${unidades(resultado.detalle.quantity)} de “${resultado.producto.nombre}” ` +
        `(compra ${resultado.detalle.id_purchase}). Stock: ${resultado.stockAnterior} → ${resultado.producto.cantidad_stock}.`
      : `Recepción confirmada: ${unidades(resultado.detalle.quantity)} (compra ${resultado.detalle.id_purchase}).`;
    await mostrarAviso('Recepción confirmada.');
  } catch (e) {
    const err = aErrorApi(e);
    if (err.status === 422) erroresApi.value = err.errores;
    else if (err.status !== 401) await mostrarAviso(err.message, 'danger');
  }
}
</script>

<style scoped>
.subtitulo {
  margin: -0.5rem 0 1rem;
}

.boton-escanear {
  margin: 0 0 1rem;
  min-height: var(--tap);
}

.busqueda-codigo {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: start;
  margin-bottom: 1rem;
}

.busqueda-codigo ion-button {
  margin: 0.4rem 0 0;
  min-height: var(--tap);
}

fieldset.grupo-campos {
  grid-template-columns: minmax(0, 1fr);
}

.lista-datos {
  padding: 0;
  background: transparent;
}

.dato {
  color: var(--texto);
  font-size: 1rem;
  text-align: end;
  overflow-wrap: anywhere;
}
</style>
