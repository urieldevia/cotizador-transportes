import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Transportes Ramírez',
        short_name: 'Transp. Ramírez',
        description: 'Sistema de gestión de cotizaciones, despacho y volantes',
        theme_color: '#007AFF',
        background_color: '#F2F2F7',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  // Si vas a subir a Vercel, quita la línea 'base'. 
  // Si subes a GitHub Pages, déjala como '/cotizador-transportes/'
  base: '/' 
});