<template>
  <ion-page>
    <EncabezadoSecundario
      :titulo="esEdicion ? 'Editar producto' : 'Nuevo producto'"
      :volver-a="esEdicion ? `/tabs/productos/${id}` : '/tabs/productos'"
    />

    <ion-content ref="contenido" class="ion-padding">
      <div class="contenedor-medio">
        <EstadoCarga v-if="cargando" mensaje="Cargando producto…" />

        <EstadoError v-else-if="errorCarga" :mensaje="errorCarga" @reintentar="cargarExistente">
          <template #acciones>
            <ion-button size="small" fill="outline" router-link="/tabs/productos" router-direction="back">
              Volver a productos
            </ion-button>
          </template>
        </EstadoError>

        <template v-else>
          <AvisoSinConexion />
          <MensajeAviso v-if="hayErrores" tipo="error">
            Los datos enviados no son válidos. Revise los campos marcados.
          </MensajeAviso>

          <EstadoCarga v-if="productos.cargandoCatalogos" mensaje="Cargando categorías, marcas y unidades…" />
          <EstadoError
            v-else-if="productos.errorCatalogos"
            :mensaje="`No se pudieron cargar las categorías, marcas o unidades. ${productos.errorCatalogos}`"
            :deshabilitado="!red.conectado"
            @reintentar="productos.cargarCatalogos()"
          />

          <form novalidate @submit.prevent="guardar">
            <fieldset class="grupo-campos">
              <legend>Datos generales</legend>
              <ion-input
                v-model="formulario.nombre"
                :class="clasesCampo('nombre')"
                fill="outline"
                label="Nombre *"
                label-placement="stacked"
                :maxlength="150"
                :error-text="errores.nombre?.[0]"
              />
              <ion-textarea
                v-model="formulario.descripcion"
                :class="clasesCampo('descripcion')"
                fill="outline"
                label="Descripción"
                label-placement="stacked"
                :auto-grow="true"
                :maxlength="1000"
                :error-text="errores.descripcion?.[0]"
              />
              <ion-input
                v-model="formulario.sku"
                :class="clasesCampo('sku')"
                fill="outline"
                label="SKU *"
                label-placement="stacked"
                :maxlength="50"
                :error-text="errores.sku?.[0]"
              />
              <ion-input
                v-model="formulario.codigo_barras"
                :class="clasesCampo('codigo_barras')"
                fill="outline"
                label="Código de barras"
                label-placement="stacked"
                inputmode="numeric"
                :maxlength="50"
                :error-text="errores.codigo_barras?.[0]"
              />
            </fieldset>

            <fieldset class="grupo-campos">
              <legend>Clasificación</legend>
              <ion-select
                v-model="formulario.id_categoria"
                :class="clasesCampo('id_categoria', productos.erroresCatalogo.categorias)"
                fill="outline"
                label="Categoría *"
                label-placement="stacked"
                placeholder="Seleccione…"
                :error-text="errores.id_categoria?.[0] ?? productos.erroresCatalogo.categorias ?? undefined"
              >
                <ion-select-option v-for="c in productos.catalogos.categorias" :key="c.id" :value="c.id">
                  {{ c.nombre }}
                </ion-select-option>
              </ion-select>
              <ion-select
                v-model="formulario.id_marca"
                :class="clasesCampo('id_marca', productos.erroresCatalogo.marcas)"
                fill="outline"
                label="Marca *"
                label-placement="stacked"
                placeholder="Seleccione…"
                :error-text="errores.id_marca?.[0] ?? productos.erroresCatalogo.marcas ?? undefined"
              >
                <ion-select-option v-for="m in productos.catalogos.marcas" :key="m.id" :value="m.id">
                  {{ m.nombre }}
                </ion-select-option>
              </ion-select>
              <ion-select
                v-model="formulario.id_unidad"
                :class="clasesCampo('id_unidad', productos.erroresCatalogo.unidades)"
                fill="outline"
                label="Unidad *"
                label-placement="stacked"
                placeholder="Seleccione…"
                :error-text="errores.id_unidad?.[0] ?? productos.erroresCatalogo.unidades ?? undefined"
              >
                <ion-select-option v-for="u in productos.catalogos.unidades" :key="u.id" :value="u.id">
                  {{ u.nombre }}
                </ion-select-option>
              </ion-select>
            </fieldset>

            <fieldset class="grupo-campos">
              <legend>Precio e inventario</legend>
              <ion-input
                v-model="formulario.precio"
                :class="clasesCampo('precio')"
                fill="outline"
                label="Precio (₡) *"
                label-placement="stacked"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.01"
                :error-text="errores.precio?.[0]"
              />
              <ion-input
                v-model="formulario.tasa_impuesto"
                :class="clasesCampo('tasa_impuesto')"
                fill="outline"
                label="Tasa de impuesto"
                label-placement="stacked"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.01"
                helper-text="Como fracción: 0.13 equivale a 13 %. Si se deja vacío, la API usa 0.13."
                :error-text="errores.tasa_impuesto?.[0]"
              />
              <ion-input
                v-model="formulario.cantidad_stock"
                :class="clasesCampo('cantidad_stock')"
                fill="outline"
                label="Cantidad en stock *"
                label-placement="stacked"
                type="number"
                inputmode="numeric"
                min="0"
                step="1"
                :error-text="errores.cantidad_stock?.[0]"
              />
              <ion-input
                v-model="formulario.stock_minimo"
                :class="clasesCampo('stock_minimo')"
                fill="outline"
                label="Stock mínimo"
                label-placement="stacked"
                type="number"
                inputmode="numeric"
                min="0"
                step="1"
                :error-text="errores.stock_minimo?.[0]"
              />
              <ion-input
                v-model="formulario.stock_maximo"
                :class="clasesCampo('stock_maximo')"
                fill="outline"
                label="Stock máximo"
                label-placement="stacked"
                type="number"
                inputmode="numeric"
                min="0"
                step="1"
                :error-text="errores.stock_maximo?.[0]"
              />
              <ion-input
                v-model="formulario.peso"
                :class="clasesCampo('peso')"
                fill="outline"
                label="Peso"
                label-placement="stacked"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.01"
                :error-text="errores.peso?.[0]"
              />
            </fieldset>

            <fieldset class="grupo-campos">
              <legend>Estado</legend>
              <ion-toggle v-model="formulario.esta_activo" justify="space-between">Producto activo</ion-toggle>
            </fieldset>

            <div class="acciones">
              <ion-button type="submit" :disabled="enviando || !red.conectado">
                <ion-spinner v-if="enviando" slot="start" name="crescent" />
                {{ textoBoton }}
              </ion-button>
              <ion-button fill="outline" color="medium" :disabled="enviando" @click="cancelar">Cancelar</ion-button>
            </div>
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
  IonTextarea,
  IonToggle,
  onIonViewWillEnter,
  useIonRouter,
} from '@ionic/vue';
import { computed, reactive, ref } from 'vue';

import AvisoSinConexion from '@/components/AvisoSinConexion.vue';
import EncabezadoSecundario from '@/components/EncabezadoSecundario.vue';
import EstadoCarga from '@/components/EstadoCarga.vue';
import EstadoError from '@/components/EstadoError.vue';
import MensajeAviso from '@/components/MensajeAviso.vue';
import { aErrorApi } from '@/servicios/errores';
import type { CuerpoProducto } from '@/servicios/productosApi';
import { useProductosStore } from '@/stores/productos';
import { useRedStore } from '@/stores/red';
import type { ErroresCampo, Producto } from '@/types/modelos';
import { numeroONulo, texto, textoONulo } from '@/utils/conversion';
import { mostrarAviso, volver } from '@/utils/navegacion';

const props = defineProps<{ id?: string }>();

const productos = useProductosStore();
const red = useRedStore();
const ionRouter = useIonRouter();
const contenido = ref<InstanceType<typeof IonContent> | null>(null);

const esEdicion = props.id !== undefined;
const rutaRespaldo = esEdicion ? `/tabs/productos/${props.id}` : '/tabs/productos';

const formulario = reactive({
  nombre: '',
  descripcion: '',
  sku: '',
  codigo_barras: '',
  id_categoria: null as number | null,
  id_marca: null as number | null,
  id_unidad: null as number | null,
  precio: '',
  tasa_impuesto: '',
  cantidad_stock: '',
  stock_minimo: '',
  stock_maximo: '',
  peso: '',
  esta_activo: true,
});

const cargando = ref(false);
const errorCarga = ref<string | null>(null);
const enviando = ref(false);
const errores = ref<ErroresCampo>({});
const hayErrores = computed(() => Object.keys(errores.value).length > 0);
const textoBoton = computed(() => {
  if (enviando.value) return 'Guardando…';
  return esEdicion ? 'Guardar cambios' : 'Crear producto';
});

function clasesCampo(campo: string, errorExtra: string | null = null) {
  return ['campo', { 'ion-invalid ion-touched': Boolean(errores.value[campo] || errorExtra) }];
}

function llenar(p: Producto) {
  Object.assign(formulario, {
    nombre: p.nombre,
    descripcion: p.descripcion ?? '',
    sku: p.sku,
    codigo_barras: p.codigo_barras ?? '',
    id_categoria: p.id_categoria,
    id_marca: p.id_marca,
    id_unidad: p.id_unidad,
    precio: texto(p.precio),
    tasa_impuesto: texto(p.tasa_impuesto),
    cantidad_stock: texto(p.cantidad_stock),
    stock_minimo: texto(p.stock_minimo),
    stock_maximo: texto(p.stock_maximo),
    peso: texto(p.peso),
    esta_activo: p.esta_activo,
  });
}

async function cargarExistente() {
  if (!esEdicion) return;
  cargando.value = true;
  errorCarga.value = null;
  try {
    llenar((await productos.obtener(Number(props.id))).producto);
  } catch (e) {
    const err = aErrorApi(e);
    if (err.status !== 401) errorCarga.value = err.message;
  } finally {
    cargando.value = false;
  }
}

let iniciado = false;
onIonViewWillEnter(() => {
  void productos.cargarCatalogos();
  if (!iniciado) {
    iniciado = true;
    void cargarExistente();
  }
});

function cuerpoDesdeFormulario(): CuerpoProducto {
  return {
    id_categoria: formulario.id_categoria,
    id_marca: formulario.id_marca,
    id_unidad: formulario.id_unidad,
    nombre: formulario.nombre,
    descripcion: textoONulo(formulario.descripcion),
    sku: formulario.sku,
    codigo_barras: textoONulo(formulario.codigo_barras),
    precio: numeroONulo(formulario.precio),
    tasa_impuesto: numeroONulo(formulario.tasa_impuesto),
    cantidad_stock: numeroONulo(formulario.cantidad_stock),
    stock_minimo: numeroONulo(formulario.stock_minimo),
    stock_maximo: numeroONulo(formulario.stock_maximo),
    peso: numeroONulo(formulario.peso),
    esta_activo: formulario.esta_activo,
  };
}

async function guardar() {
  errores.value = {};
  enviando.value = true;
  try {
    const cuerpo = cuerpoDesdeFormulario();
    const producto = esEdicion ? await productos.actualizar(Number(props.id), cuerpo) : await productos.crear(cuerpo);
    await mostrarAviso(
      esEdicion ? `Producto “${producto.nombre}” actualizado.` : `Producto “${producto.nombre}” creado.`,
    );
    volver(ionRouter, rutaRespaldo);
  } catch (e) {
    const err = aErrorApi(e);
    if (err.status === 422) {
      errores.value = err.errores;
      await contenido.value?.$el.scrollToTop(300);
    } else if (err.status !== 401) {
      await mostrarAviso(err.message, 'danger');
    }
  } finally {
    enviando.value = false;
  }
}

function cancelar() {
  volver(ionRouter, rutaRespaldo);
}
</script>
