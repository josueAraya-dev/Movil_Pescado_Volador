<template>
  <ion-page>
    <EncabezadoSecundario :titulo="esEdicion ? `Editar venta #${id}` : 'Nueva venta'" volver-a="/tabs/ventas" />

    <ion-content ref="contenido" class="ion-padding">
      <div class="contenedor-medio">
        <EstadoCarga v-if="cargando" mensaje="Cargando venta…" />

        <EstadoError v-else-if="errorCarga" :mensaje="errorCarga" @reintentar="cargarExistente">
          <template #acciones>
            <ion-button size="small" fill="outline" router-link="/tabs/ventas" router-direction="back">
              Volver al historial
            </ion-button>
          </template>
        </EstadoError>

        <template v-else>
          <AvisoDatosGuardados v-if="desdeCache" :guardado-en="guardadoEn" origen="sin-conexion" />
          <AvisoSinConexion />

          <EstadoCarga v-if="ventas.cargandoClientes" mensaje="Cargando clientes…" />
          <EstadoError
            v-else-if="ventas.errorClientes && sesion.puede('view customers')"
            :mensaje="`No se pudieron cargar los clientes. ${ventas.errorClientes}`"
            :deshabilitado="!red.conectado"
            @reintentar="ventas.cargarClientes()"
          />

          <form novalidate @submit.prevent="guardar">
            <fieldset class="grupo-campos">
              <legend>Venta y cobro</legend>

              <ion-input
                v-model="valores.producto_sku"
                class="campo"
                fill="outline"
                label="Producto (SKU o pistola)"
                label-placement="stacked"
                placeholder="SKU-MART-016-001"
                autocomplete="off"
                helper-text="Al salir del campo, la API busca el producto y calcula el total."
                @ion-change="buscarProducto"
              />
              <EstadoCarga v-if="buscandoProducto" mensaje="Buscando producto…" />
              <EstadoError
                v-else-if="errorBusqueda"
                :mensaje="`No se pudo buscar el producto. ${errorBusqueda}`"
                @reintentar="buscarProducto"
              />
              <ion-input
                v-model="valores.cantidad"
                class="campo"
                fill="outline"
                label="Cantidad"
                label-placement="stacked"
                type="number"
                inputmode="numeric"
                min="1"
              />
              <ion-select
                v-model="valores.id_customer"
                :class="clasesCampo('id_customer', ventas.errorClientes)"
                fill="outline"
                label="Cliente"
                label-placement="stacked"
                helper-text="Elija mostrador para una venta rápida."
                :error-text="errores.id_customer?.[0] ?? ventas.errorClientes ?? undefined"
              >
                <ion-select-option value="">Mostrador</ion-select-option>
                <ion-select-option v-for="c in ventas.clientes" :key="c.id_customer" :value="c.id_customer">
                  {{ `${c.first_name} ${c.last_name1}` }}
                </ion-select-option>
              </ion-select>
              <ion-input
                v-model="valores.sale_date"
                :class="clasesCampo('sale_date')"
                fill="outline"
                label="Fecha de venta"
                label-placement="stacked"
                type="date"
                :error-text="errores.sale_date?.[0]"
              />
              <ion-input
                v-model="valores.total"
                :class="clasesCampo('total')"
                fill="outline"
                label="Total (₡)"
                label-placement="stacked"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.01"
                :error-text="errores.total?.[0]"
              />
              <ion-input
                v-model="valores.tax_amount"
                :class="clasesCampo('tax_amount')"
                fill="outline"
                label="Impuesto (₡)"
                label-placement="stacked"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.01"
                :error-text="errores.tax_amount?.[0]"
              />
              <ion-input
                v-model="valores.discount"
                :class="clasesCampo('discount')"
                fill="outline"
                label="Descuento (₡)"
                label-placement="stacked"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.01"
                :error-text="errores.discount?.[0]"
              />
              <ion-select
                v-model="valores.status"
                :class="clasesCampo('status')"
                fill="outline"
                label="Estado"
                label-placement="stacked"
                :error-text="errores.status?.[0]"
              >
                <ion-select-option v-for="estado in ESTADOS_VENTA" :key="estado" :value="estado">
                  {{ estado.charAt(0).toUpperCase() + estado.slice(1) }}
                </ion-select-option>
              </ion-select>
            </fieldset>

            <div class="acciones">
              <ion-button type="submit" :disabled="enviando || !red.conectado">
                <ion-spinner v-if="enviando" slot="start" name="crescent" />
                {{ enviando ? 'Guardando venta…' : 'Confirmar venta' }}
              </ion-button>
              <ion-button fill="outline" color="medium" :disabled="enviando" @click="limpiar">Limpiar</ion-button>
              <ion-button v-if="esEdicion" fill="outline" color="medium" :disabled="enviando" @click="cancelarEdicion">
                Cancelar edición
              </ion-button>
            </div>

            <MensajeAviso v-if="mensajeError" class="ion-margin-top" tipo="error">{{ mensajeError }}</MensajeAviso>
            <MensajeAviso v-else-if="mensaje" class="ion-margin-top" tipo="exito">{{ mensaje }}</MensajeAviso>
          </form>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonContent,
  IonInput,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  onIonViewWillEnter,
  useIonRouter,
} from '@ionic/vue';
import { onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import AvisoDatosGuardados from '@/components/AvisoDatosGuardados.vue';
import AvisoSinConexion from '@/components/AvisoSinConexion.vue';
import EncabezadoSecundario from '@/components/EncabezadoSecundario.vue';
import EstadoCarga from '@/components/EstadoCarga.vue';
import EstadoError from '@/components/EstadoError.vue';
import MensajeAviso from '@/components/MensajeAviso.vue';
import { aErrorApi } from '@/servicios/errores';
import type { CuerpoVenta } from '@/servicios/ventasApi';
import { useBorradorVentaStore } from '@/stores/borradorVenta';
import { useProductosStore } from '@/stores/productos';
import { useRedStore } from '@/stores/red';
import { useSesionStore } from '@/stores/sesion';
import { ESTADOS_VENTA, useVentasStore } from '@/stores/ventas';
import type { ErroresCampo, Venta } from '@/types/modelos';
import { colones, hoyISO } from '@/utils/formato';
import { mostrarAviso, volver } from '@/utils/navegacion';

const props = defineProps<{ id?: string }>();

const ventas = useVentasStore();
const productos = useProductosStore();
const sesion = useSesionStore();
const red = useRedStore();
const borrador = useBorradorVentaStore();
const ionRouter = useIonRouter();
const contenido = ref<InstanceType<typeof IonContent> | null>(null);

const esEdicion = props.id !== undefined;
const rutaFormulario = useRoute().fullPath;

interface ValoresFormulario {
  id_customer: string;
  sale_date: string;
  total: string;
  tax_amount: string;
  discount: string;
  status: string;
  producto_sku: string;
  cantidad: string;
}

function valoresDe(venta: Venta | null): ValoresFormulario {
  return {
    id_customer: venta?.id_customer ?? '',
    sale_date: venta ? String(venta.sale_date).slice(0, 10) : hoyISO(),
    total: venta ? String(venta.total) : '',
    tax_amount: venta ? String(venta.tax_amount) : '',
    discount: venta ? String(venta.discount) : '',
    status: venta?.status ?? 'completado',
    producto_sku: '',
    cantidad: '1',
  };
}

const valores = reactive<ValoresFormulario>(valoresDe(null));
const errores = ref<ErroresCampo>({});
const mensaje = ref<string | null>(null);
const mensajeError = ref<string | null>(null);
const cargando = ref(false);
const errorCarga = ref<string | null>(null);
const enviando = ref(false);
const desdeCache = ref(false);
const guardadoEn = ref<string | null>(null);
const buscandoProducto = ref(false);
const errorBusqueda = ref<string | null>(null);

const restaurado = borrador.tomar(rutaFormulario);
if (restaurado) {
  Object.assign(valores, restaurado);
  mensaje.value = 'Sesión restaurada: no se perdieron los datos del formulario.';
}

watch(valores, (actuales) => borrador.guardar(rutaFormulario, { ...actuales }), { deep: true });

// Si la sesión expiró (401), el borrador se conserva para después del login.
onUnmounted(() => {
  if (sesion.autenticado) borrador.limpiar();
});

async function cargarExistente() {
  if (!esEdicion) return;
  cargando.value = true;
  errorCarga.value = null;
  try {
    const resultado = await ventas.obtener(Number(props.id));
    desdeCache.value = resultado.desdeCache;
    guardadoEn.value = resultado.guardadoEn;
    if (!restaurado) Object.assign(valores, valoresDe(resultado.venta));
    if (!mensaje.value) mensaje.value = `Editando la venta #${props.id}.`;
  } catch (e) {
    const err = aErrorApi(e);
    if (err.status !== 401) errorCarga.value = err.message;
  } finally {
    cargando.value = false;
  }
}

let iniciado = false;
onIonViewWillEnter(() => {
  if (ventas.clientes.length === 0 && red.conectado) void ventas.cargarClientes();
  if (!iniciado) {
    iniciado = true;
    void cargarExistente();
  }
});

function clasesCampo(campo: string, errorExtra: string | null = null) {
  return ['campo', { 'ion-invalid ion-touched': Boolean(errores.value[campo] || errorExtra) }];
}

function cuerpoDesdeFormulario(): CuerpoVenta {
  return {
    id_customer: valores.id_customer || null,
    sale_date: valores.sale_date || hoyISO(),
    total: valores.total === '' ? null : Number(valores.total),
    tax_amount: valores.tax_amount === '' ? 0 : Number(valores.tax_amount),
    discount: valores.discount === '' ? 0 : Number(valores.discount),
    status: valores.status || 'completado',
  };
}

async function buscarProducto() {
  const sku = String(valores.producto_sku ?? '').trim();
  errorBusqueda.value = null;
  if (!sku) return;

  mensajeError.value = null;
  buscandoProducto.value = true;
  try {
    const producto = await productos.buscarUno(sku);
    if (!producto) {
      mensaje.value = null;
      mensajeError.value = `No se encontró un producto con SKU “${sku}”.`;
      return;
    }
    const cantidad = Number(valores.cantidad) || 1;
    const total = Math.round(producto.precio * cantidad);
    valores.total = String(total);
    const restantes = { ...errores.value };
    delete restantes.total;
    errores.value = restantes;
    mensaje.value = `${producto.nombre}: ${colones(producto.precio)} × ${cantidad} = ${colones(total)}`;
  } catch (e) {
    const err = aErrorApi(e);
    if (err.status !== 401) errorBusqueda.value = err.message;
  } finally {
    buscandoProducto.value = false;
  }
}

async function guardar() {
  errores.value = {};
  mensajeError.value = null;
  enviando.value = true;
  try {
    const cuerpo = cuerpoDesdeFormulario();
    const venta = esEdicion ? await ventas.actualizar(Number(props.id), cuerpo) : await ventas.crear(cuerpo);
    borrador.limpiar();
    await mostrarAviso(esEdicion ? `Venta #${venta.id} actualizada.` : `Venta #${venta.id} registrada.`);
    volver(ionRouter, '/tabs/ventas');
  } catch (e) {
    const err = aErrorApi(e);
    if (err.status === 401) return;
    if (err.status === 422) {
      errores.value = err.errores;
      mensaje.value = null;
      mensajeError.value = 'Los datos enviados no son válidos. Revise los campos marcados.';
      await contenido.value?.$el.scrollToTop(300);
      return;
    }
    mensajeError.value = err.message;
  } finally {
    enviando.value = false;
  }
}

function limpiar() {
  borrador.limpiar();
  if (esEdicion) {
    ionRouter.replace('/tabs/ventas/nueva');
    return;
  }
  Object.assign(valores, valoresDe(null));
  errores.value = {};
  mensajeError.value = null;
  mensaje.value = 'Formulario limpiado.';
}

async function cancelarEdicion() {
  borrador.limpiar();
  await mostrarAviso('Edición cancelada.', 'medium');
  volver(ionRouter, '/tabs/ventas');
}
</script>
