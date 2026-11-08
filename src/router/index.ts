import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';

import { RUTA_INICIO, RUTA_LOGIN, resolverAcceso } from './guardian';

import { useSesionStore } from '@/stores/sesion';

// Puntos 1 y 2: páginas con carga diferida (import()) y parámetro :id.
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: RUTA_INICIO,
  },
  {
    path: RUTA_LOGIN,
    component: () => import('@/views/LoginPage.vue'),
    meta: { publica: true },
  },
  {
    path: '/tabs/',
    component: () => import('@/views/TabsPage.vue'),
    children: [
      {
        path: '',
        redirect: RUTA_INICIO,
      },
      {
        path: 'productos',
        component: () => import('@/views/productos/ProductosPage.vue'),
        meta: { permiso: 'view products' },
      },
      {
        path: 'productos/nuevo',
        component: () => import('@/views/productos/ProductoFormularioPage.vue'),
        meta: { permiso: 'create products' },
      },
      {
        path: 'productos/:id(\\d+)',
        component: () => import('@/views/productos/ProductoDetallePage.vue'),
        props: true,
        meta: { permiso: 'view products' },
      },
      {
        path: 'productos/:id(\\d+)/editar',
        component: () => import('@/views/productos/ProductoFormularioPage.vue'),
        props: true,
        meta: { permiso: 'update products' },
      },
      {
        path: 'ventas',
        component: () => import('@/views/ventas/VentasPage.vue'),
        meta: { permiso: 'view sales' },
      },
      {
        path: 'ventas/nueva',
        component: () => import('@/views/ventas/VentaFormularioPage.vue'),
        meta: { permiso: 'create sales' },
      },
      {
        path: 'ventas/:id(\\d+)/editar',
        component: () => import('@/views/ventas/VentaFormularioPage.vue'),
        props: true,
        meta: { permiso: 'update sales' },
      },
      {
        path: 'recepcion',
        component: () => import('@/views/recepcion/RecepcionPage.vue'),
        meta: { permiso: 'receive purchases' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: RUTA_INICIO,
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// Punto 2: guardián de navegación.
router.beforeEach(async (to) => {
  const sesion = useSesionStore();
  await sesion.restaurar();
  return resolverAcceso(to, sesion);
});

export default router;
