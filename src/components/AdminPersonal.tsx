import { useState } from 'react';
import { useCatalogo, crearPersonal, eliminarPersonal } from '../hooks/useCatalogo';

export function AdminPersonal() {
  const { personal, refrescar } = useCatalogo();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apodo, setApodo] = useState('');
  const [rol, setRol] = useState('chofer');
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return; }
    try {
      await crearPersonal({ nombre_completo: nombre.toUpperCase(), apodo: apodo || null, telefono: null, rol });
      setNombre(''); setApodo(''); setMostrarForm(false); setError(null);
      await refrescar();
    } catch (e: any) { setError(e.message); }
  };

  return (
    <div className="pb-28">
      <div className="flex-between mb-4">
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Personal ({personal.length})</h2>
        <button className="btn-apple btn-apple-secondary" onClick={() => setMostrarForm(!mostrarForm)}>{mostrarForm ? 'Cancelar' : '+ Agregar'}</button>
      </div>

      {mostrarForm && (
        <div className="apple-card">
          <label className="apple-label">NOMBRE COMPLETO</label>
          <input className="apple-input mb-2" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="NOMBRE" />
          <label className="apple-label">APODO</label>
          <input className="apple-input mb-2" value={apodo} onChange={(e) => setApodo(e.target.value)} placeholder="Apodo (opcional)" />
          <label className="apple-label">ROL</label>
          <select className="apple-input mb-4" value={rol} onChange={(e) => setRol(e.target.value)}>
            <option value="chofer">Chofer</option>
            <option value="auxiliar">Auxiliar</option>
            <option value="ambos">Chofer / Auxiliar</option>
          </select>
          {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
          <button className="btn-apple btn-apple-primary w-full" onClick={guardar}>Guardar</button>
        </div>
      )}

      <div className="apple-card p-0 overflow-hidden">
        {personal.map((p) => (
          <div key={p.id} className="apple-list-row" style={{ padding: '10px 16px' }}>
            <div style={{ flex: 1 }}>
              <div className="apple-list-title" style={{ fontSize: '14px' }}>{p.nombre_completo}</div>
              {p.apodo && <div className="apple-list-subtitle">({p.apodo})</div>}
            </div>
            <span className={`apple-badge-rol rol-${p.rol}`}>{p.rol}</span>
            <button className="btn-remove-punto ml-2" onClick={async () => { await eliminarPersonal(p.id); await refrescar(); }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}