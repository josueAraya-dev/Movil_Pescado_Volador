<template>
  <ion-page>
    <ion-header class="encabezado-marca">
      <ion-toolbar class="barra-marca">
        <ion-title>Ferretería Pescado Volador</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="contenedor-angosto">
        <h1>Iniciar sesión</h1>

        <MensajeAviso v-if="sesionExpirada" tipo="info" :icono="timeOutline">
          Su sesión expiró (el token vence a las 2 horas). Inicie sesión de nuevo: los datos del formulario se
          conservaron.
        </MensajeAviso>

        <AvisoSinConexion mensaje="Para iniciar sesión se necesita conexión con la API." />

        <form novalidate @submit.prevent="iniciarSesion">
          <fieldset class="grupo-campos">
            <legend>Acceso a la API</legend>

            <ion-input
              v-model="correo"
              :class="['campo', { 'ion-invalid ion-touched': errores.email }]"
              fill="outline"
              label="Correo electrónico"
              label-placement="stacked"
              type="email"
              inputmode="email"
              autocomplete="username"
              helper-text="admin@example.com · cajero@example.com · bodeguero@example.com"
              :error-text="errores.email?.[0]"
            />

            <ion-input
              v-model="contrasena"
              :class="['campo', { 'ion-invalid ion-touched': errores.password }]"
              fill="outline"
              label="Contraseña"
              label-placement="stacked"
              type="password"
              autocomplete="current-password"
              helper-text="Usuarios de prueba: contraseña “password”."
              :error-text="errores.password?.[0]"
            >
              <ion-input-password-toggle slot="end" />
            </ion-input>
          </fieldset>

          <div class="acciones">
            <ion-button type="submit" :disabled="enviando || !red.conectado">
              <ion-spinner v-if="enviando" slot="start" name="crescent" />
              {{ enviando ? 'Ingresando…' : 'Ingresar' }}
            </ion-button>
          </div>
          <EstadoError
            v-if="mensajeError"
            class="ion-margin-top"
            :mensaje="mensajeError"
            :sin-reintento="!errorReintentable"
            :deshabilitado="enviando || !red.conectado"
            @reintentar="iniciarSesion"
          />
        </form>

        <address class="contacto">
          <p>Correo electrónico: info@ferreteriapescadofeliz.com</p>
          <p>Teléfono: (506) 2665-1308</p>
        </address>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonInputPasswordToggle,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from '@ionic/vue';
import { timeOutline } from 'ionicons/icons';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';

import AvisoSinConexion from '@/components/AvisoSinConexion.vue';
import EstadoError from '@/components/EstadoError.vue';
import MensajeAviso from '@/components/MensajeAviso.vue';
import { destinoTrasLogin } from '@/router/guardian';
import { iniciarSesionApi } from '@/servicios/authApi';
import { aErrorApi } from '@/servicios/errores';
import { useRedStore } from '@/stores/red';
import { useSesionStore } from '@/stores/sesion';
import type { ErroresCampo } from '@/types/modelos';

const sesion = useSesionStore();
const red = useRedStore();
const ionRouter = useIonRouter();
const route = useRoute();

const correo = ref('');
const contrasena = ref('');
const errores = ref<ErroresCampo>({});
const mensajeError = ref<string | null>(null);
const errorReintentable = ref(false);
const enviando = ref(false);

const sesionExpirada = computed(() => route.query.motivo === 'expirada');

async function iniciarSesion() {
  errores.value = {};
  mensajeError.value = null;
  enviando.value = true;

  try {
    const respuesta = await iniciarSesionApi(correo.value.trim(), contrasena.value);
    await sesion.abrirSesion({
      token: respuesta.token,
      expiraEn: respuesta.expires_at,
      permisos: respuesta.abilities,
      correo: correo.value.trim(),
    });
  } catch (error) {
    const e = aErrorApi(error);
    if (e.status === 422) errores.value = e.errores;
    else mensajeError.value = e.message;
    errorReintentable.value = e.esDeConexion || e.status >= 500;
    return;
  } finally {
    enviando.value = false;
  }

  contrasena.value = '';
  // 'replace' saca el login del historial.
  ionRouter.navigate(destinoTrasLogin(route.query.redirect), 'root', 'replace');
}
</script>
