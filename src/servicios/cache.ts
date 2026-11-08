// Punto 6: caché del último listado, con su marca de tiempo.
import { Preferences } from '@capacitor/preferences';

export const CLAVES_CACHE = {
  productos: 'cache.productos',
  ventas: 'cache.ventas',
} as const;

type ClaveCache = (typeof CLAVES_CACHE)[keyof typeof CLAVES_CACHE];

export interface EntradaCache<T> {
  datos: T;
  guardadoEn: string;
}

export async function guardarCache<T>(clave: ClaveCache, datos: T): Promise<EntradaCache<T>> {
  const entrada: EntradaCache<T> = { datos, guardadoEn: new Date().toISOString() };
  await Preferences.set({ key: clave, value: JSON.stringify(entrada) });
  return entrada;
}

export async function leerCache<T>(clave: ClaveCache): Promise<EntradaCache<T> | null> {
  const { value } = await Preferences.get({ key: clave });
  if (!value) return null;
  try {
    return JSON.parse(value) as EntradaCache<T>;
  } catch {
    return null;
  }
}

export async function limpiarCache(): Promise<void> {
  await Promise.all(Object.values(CLAVES_CACHE).map((key) => Preferences.remove({ key })));
}
