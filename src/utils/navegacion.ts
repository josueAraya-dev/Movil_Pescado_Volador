import { toastController, type UseIonRouterResult } from '@ionic/vue';

export function volver(ionRouter: UseIonRouterResult, respaldo: string): void {
  if (ionRouter.canGoBack()) {
    ionRouter.back();
  } else {
    ionRouter.navigate(respaldo, 'back', 'replace');
  }
}

export async function mostrarAviso(mensaje: string, color: 'success' | 'danger' | 'medium' = 'success'): Promise<void> {
  const aviso = await toastController.create({
    message: mensaje,
    duration: 2500,
    color,
    position: 'bottom',
    positionAnchor: 'barra-pestanas',
  });
  await aviso.present();
}
