import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Esto hace que la app se actualice sola en segundo plano
      registerType: 'autoUpdate',

      // Archivos que se incluyen al instalar
      includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'],

      // Configuración de la app (nombre, colores, íconos)
      manifest: {
        name: 'Cotizador de Transporte',
        short_name: 'Cotizador',
        description: 'Calculadora de cotización de servicios de transporte de carga',
        theme_color: '#0072de',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/cotizador-transportes/',
        start_url: '/cotizador-transportes/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },

      // Caché de la API de Supabase para que funcione offline
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 horas
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  base: '/cotizador-transportes/',
});