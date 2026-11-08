// Punto 7: único archivo que usa el plugin de la cámara.
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { BarcodeFormat, BarcodeScanner, LensFacing } from '@capacitor-mlkit/barcode-scanning';

export type EstadoPermisoCamara =
  'concedido' | 'sin-preguntar' | 'denegado-una-vez' | 'denegado-permanente' | 'no-disponible';

export type AccionPermiso = 'escanear' | 'pedir' | 'explicar-y-pedir' | 'ir-a-ajustes' | 'solo-manual';

export const CLASE_ESCANER_ACTIVO = 'escaner-activo';

export function traducirEstado(estado: string): EstadoPermisoCamara {
  switch (estado) {
    case 'granted':
    case 'limited':
      return 'concedido';
    case 'prompt':
      return 'sin-preguntar';
    case 'prompt-with-rationale':
      return 'denegado-una-vez';
    // En Android, 'denied' es denegado de forma permanente.
    case 'denied':
      return 'denegado-permanente';
    default:
      return 'no-disponible';
  }
}

export function accionSegunPermiso(estado: EstadoPermisoCamara): AccionPermiso {
  switch (estado) {
    case 'concedido':
      return 'escanear';
    case 'sin-preguntar':
      return 'pedir';
    case 'denegado-una-vez':
      return 'explicar-y-pedir';
    case 'denegado-permanente':
      return 'ir-a-ajustes';
    default:
      return 'solo-manual';
  }
}

async function camaraDisponible(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    return (await BarcodeScanner.isSupported()).supported;
  } catch {
    return false;
  }
}

export async function consultarPermisoCamara(): Promise<EstadoPermisoCamara> {
  if (!(await camaraDisponible())) return 'no-disponible';
  return traducirEstado((await BarcodeScanner.checkPermissions()).camera);
}

export async function pedirPermisoCamara(): Promise<EstadoPermisoCamara> {
  if (!(await camaraDisponible())) return 'no-disponible';
  return traducirEstado((await BarcodeScanner.requestPermissions()).camera);
}

export async function abrirAjustesApp(): Promise<void> {
  await BarcodeScanner.openSettings();
}

interface SesionEscaneo {
  terminar: (codigo: string | null) => void;
  fallar: (error: Error) => void;
  oyentes: PluginListenerHandle[];
}

let sesionActual: SesionEscaneo | null = null;

function marcarEscaneo(activo: boolean): void {
  document.documentElement.classList.toggle(CLASE_ESCANER_ACTIVO, activo);
  document.body.classList.toggle(CLASE_ESCANER_ACTIVO, activo);
}

async function finalizar(resultado: { codigo: string | null } | { error: Error }): Promise<void> {
  const sesion = sesionActual;
  if (!sesion) return;
  sesionActual = null;
  marcarEscaneo(false);
  await Promise.all(sesion.oyentes.map((o) => o.remove()));
  try {
    await BarcodeScanner.stopScan();
  } catch {
    // La cámara no llegó a abrirse.
  }
  if ('error' in resultado) sesion.fallar(resultado.error);
  else sesion.terminar(resultado.codigo);
}

export async function escanearCodigo(): Promise<string | null> {
  await cancelarEscaneo();

  const resultado = new Promise<string | null>((terminar, fallar) => {
    sesionActual = { terminar, fallar, oyentes: [] };
  });
  const sesion = sesionActual as SesionEscaneo | null;
  if (!sesion) return null;

  try {
    sesion.oyentes.push(
      await BarcodeScanner.addListener('barcodesScanned', (evento) => {
        const barcode = evento.barcodes[0];
        const codigo = barcode?.rawValue ?? barcode?.displayValue;
        if (codigo) void finalizar({ codigo });
      }),
      await BarcodeScanner.addListener('scanError', (evento) => {
        void finalizar({ error: new Error(evento.message) });
      }),
    );
    marcarEscaneo(true);
    await BarcodeScanner.startScan({ formats: [BarcodeFormat.Code128], lensFacing: LensFacing.Back });
  } catch (e) {
    await finalizar({ error: e instanceof Error ? e : new Error(String(e)) });
  }
  return resultado;
}

export async function cancelarEscaneo(): Promise<void> {
  await finalizar({ codigo: null });
}

export function hayEscaneoActivo(): boolean {
  return sesionActual !== null;
}
