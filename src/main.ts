import { IonicVue } from '@ionic/vue';
import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from './App.vue';
import router from './router';
import { useRedStore } from './stores/red';
import { useTemaStore } from './stores/tema';

import '@ionic/vue/css/core.css';

import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';

import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

import '@ionic/vue/css/palettes/dark.class.css';

import '@fontsource/clarity-city/400.css';
import '@fontsource/clarity-city/500.css';
import '@fontsource/clarity-city/600.css';
import '@fontsource/clarity-city/700.css';

import './theme/variables.css';
import './theme/marca.css';
import './theme/escaner.css';

// Pinia antes del router: el guardián usa el store de sesión.
const app = createApp(App).use(IonicVue).use(createPinia()).use(router);

Promise.all([useTemaStore().cargar(), useRedStore().iniciar(), router.isReady()]).then(() => {
  app.mount('#app');
});
