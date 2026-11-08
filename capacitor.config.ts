import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pescadovolador.movil',
  appName: 'Pescado Volador',
  webDir: 'dist',
  android: {
    // Solo desarrollo: permite llamar a la API por HTTP.
    allowMixedContent: true,
  },
};

export default config;
