import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Registrar el Service Worker con actualización automática
registerSW({
  immediate: true,
  onNeedRefresh() {
    // Esto se ejecuta cuando hay una nueva versión disponible
    // Con 'autoUpdate' no se muestra nada, se actualiza solo
    console.log('Nueva versión detectada, actualizando...');
  },
  onOfflineReady() {
    console.log('La aplicación está lista para funcionar sin conexión.');
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);