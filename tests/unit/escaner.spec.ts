import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  CLASE_ESCANER_ACTIVO,
  accionSegunPermiso,
  cancelarEscaneo,
  consultarPermisoCamara,
  escanearCodigo,
  hayEscaneoActivo,
  traducirEstado,
} from '@/servicios/escaner';

type Oyente = (evento: unknown) => void;

const simulado = vi.hoisted(() => ({
  nativo: true,
  permiso: 'prompt',
  oyentes: new Map<string, (evento: unknown) => void>(),
  startScan: vi.fn(async (_opciones?: unknown) => undefined),
  stopScan: vi.fn(async () => undefined),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => simulado.nativo },
}));

vi.mock('@capacitor-mlkit/barcode-scanning', () => ({
  BarcodeFormat: { Code128: 'CODE_128' },
  LensFacing: { Back: 'BACK' },
  BarcodeScanner: {
    isSupported: async () => ({ supported: true }),
    checkPermissions: async () => ({ camera: simulado.permiso }),
    startScan: simulado.startScan,
    stopScan: simulado.stopScan,
    addListener: async (evento: string, oyente: Oyente) => {
      simulado.oyentes.set(evento, oyente);
      return { remove: async () => void simulado.oyentes.delete(evento) };
    },
  },
}));

beforeEach(async () => {
  await cancelarEscaneo();
  simulado.nativo = true;
  simulado.permiso = 'prompt';
  simulado.oyentes.clear();
  simulado.startScan.mockClear();
  simulado.stopScan.mockClear();
});

describe('estados del permiso de cámara', () => {
  test('se traducen los estados de Capacitor (denied = denegado de forma permanente)', () => {
    expect(traducirEstado('granted')).toBe('concedido');
    expect(traducirEstado('prompt')).toBe('sin-preguntar');
    expect(traducirEstado('prompt-with-rationale')).toBe('denegado-una-vez');
    expect(traducirEstado('denied')).toBe('denegado-permanente');
  });

  test('cada estado lleva a una acción distinta', () => {
    expect(accionSegunPermiso('concedido')).toBe('escanear');
    expect(accionSegunPermiso('sin-preguntar')).toBe('pedir');
    expect(accionSegunPermiso('denegado-una-vez')).toBe('explicar-y-pedir');
    expect(accionSegunPermiso('denegado-permanente')).toBe('ir-a-ajustes');
    expect(accionSegunPermiso('no-disponible')).toBe('solo-manual');
  });

  test('en el navegador la cámara no está disponible (solo ingreso manual)', async () => {
    simulado.nativo = false;
    expect(await consultarPermisoCamara()).toBe('no-disponible');
  });

  test('en Android se consulta el permiso real', async () => {
    simulado.permiso = 'denied';
    expect(await consultarPermisoCamara()).toBe('denegado-permanente');
  });
});

describe('escaneo de un código', () => {
  test('abre la cámara solo para Code 128, devuelve el primer código y vuelve a mostrar la app', async () => {
    const lectura = escanearCodigo();
    await vi.waitFor(() => expect(simulado.startScan).toHaveBeenCalled());

    expect(simulado.startScan).toHaveBeenCalledWith({ formats: ['CODE_128'], lensFacing: 'BACK' });
    expect(document.body.classList.contains(CLASE_ESCANER_ACTIVO)).toBe(true);

    simulado.oyentes.get('barcodesScanned')?.({ barcodes: [{ rawValue: '2165598478087', displayValue: 'x' }] });

    expect(await lectura).toBe('2165598478087');
    expect(simulado.stopScan).toHaveBeenCalled();
    expect(document.body.classList.contains(CLASE_ESCANER_ACTIVO)).toBe(false);
    expect(simulado.oyentes.size).toBe(0);
    expect(hayEscaneoActivo()).toBe(false);
  });

  test('cancelar (botón Cancelar, atrás o app en segundo plano) devuelve null y apaga la cámara', async () => {
    const lectura = escanearCodigo();
    await vi.waitFor(() => expect(simulado.startScan).toHaveBeenCalled());

    await cancelarEscaneo();

    expect(await lectura).toBeNull();
    expect(simulado.stopScan).toHaveBeenCalled();
    expect(document.documentElement.classList.contains(CLASE_ESCANER_ACTIVO)).toBe(false);
  });

  test('si la cámara no se puede abrir, la promesa falla y la app vuelve a verse', async () => {
    simulado.startScan.mockRejectedValueOnce(new Error('User denied access to camera.'));

    await expect(escanearCodigo()).rejects.toThrow('User denied access to camera.');
    expect(document.body.classList.contains(CLASE_ESCANER_ACTIVO)).toBe(false);
  });
});
