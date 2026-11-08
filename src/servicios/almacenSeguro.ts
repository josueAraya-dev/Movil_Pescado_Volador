// Punto 5: el token se guarda cifrado (Android Keystore), no en Preferences.
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

const CLAVE_SESION = 'sesion';

export interface SesionGuardada {
  token: string;
  expiraEn: string | null;
  permisos: string[];
  correo: string;
}

function esSesionGuardada(valor: unknown): valor is SesionGuardada {
  const v = valor as Partial<SesionGuardada> | null;
  return typeof v?.token === 'string' && Array.isArray(v.permisos) && typeof v.correo === 'string';
}

export async function guardarSesion(sesion: SesionGuardada): Promise<void> {
  await SecureStorage.set(CLAVE_SESION, { ...sesion }, false);
}

export async function leerSesion(): Promise<SesionGuardada | null> {
  try {
    const valor = await SecureStorage.get(CLAVE_SESION, false);
    return esSesionGuardada(valor) ? valor : null;
  } catch {
    return null;
  }
}

export async function borrarSesion(): Promise<void> {
  try {
    await SecureStorage.remove(CLAVE_SESION);
  } catch {
    // Nada que borrar.
  }
}
