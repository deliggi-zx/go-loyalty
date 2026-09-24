import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ar.com.kapusta.app',
  appName: 'Kapusta',
  // No se usa para servir contenido (ver server.url abajo), pero Capacitor
  // igual necesita apuntar a una carpeta existente del proyecto.
  webDir: 'public',
  server: {
    // Patrón "remote URL": la app nativa carga siempre la web en producción,
    // en vez de empaquetar un build estático (necesario porque Kapusta usa
    // Server Actions / auth de Next.js, no es exportable como sitio estático).
    url: 'https://kapusta.com.ar',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#006f90',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

export default config;
