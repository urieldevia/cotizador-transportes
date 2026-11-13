import { useState } from 'react';
import { MotorCotizador } from './components/cotizador/MotorCotizador';
import { Volante } from './components/volante/Volante';
// Despacho sí está en la carpeta despacho
import { Despacho } from './components/despacho/Despacho'; 
// Pizarron está suelto directo en components
import { Pizarron } from './components/Pizarron'; 

export default function App() {
  const [tab, setTab] = useState<'cotizador' | 'despacho' | 'volante' | 'pizarron'>('cotizador');

  return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', paddingBottom: '100px' }}>
      
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #E5E5EA', display: 'flex', overflowX: 'auto',
        padding: '0 8px'
      }}>
        {[
          { id: 'cotizador', label: 'Cotizador' },
          { id: 'despacho', label: 'Base de datos' },
          { id: 'volante', label: 'Volante' },
          { id: 'pizarron', label: 'Pizarrón' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id as any)}
            style={{
              padding: '16px 20px',
              background: 'none',
              border: 'none',
              borderBottom: tab === item.id ? '3px solid #007AFF' : '3px solid transparent',
              color: tab === item.id ? '#007AFF' : '#666',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
        {tab === 'cotizador' && <MotorCotizador />}
        {tab === 'despacho' && <Despacho />}
        {tab === 'volante' && <Volante />}
        {tab === 'pizarron' && <Pizarron />}
      </main>

    </div>
  );
}