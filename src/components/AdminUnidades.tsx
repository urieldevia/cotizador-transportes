import { useState } from 'react';
import { useCatalogo, crearUnidadFisica, eliminarUnidadFisica } from '../hooks/useCatalogo';

export function AdminUnidades() {
  const { unidades, propietarios, refrescar } = useCatalogo();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [propietarioId, setPropietarioId] = useState<number | null>(null);
  const [marca, setMarca] = useState('');
  const [color, setColor] = useState('');
  const [placas, setPlacas] = useState('');
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    if (!marca.trim()) { setError('La marca es obligatoria'); return; }
    try {
      await crearUnidadFisica({ propietario_id: propietarioId, marca_modelo: marca.toUpperCase(), color: color.toUpperCase() || null, placas: placas.toUpperCase() || null, tipo_unidad_id: null, notas: null });
      setMarca(''); setColor(''); setPlacas(''); setMostrarForm(false); setError(null);
      await refrescar();
    } catch (e: any) { setError(e.message); }
  };

  return (
    <div className="pb-28">
      <div className="flex-between mb-4">
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Unidades ({unidades.length})</h2>
        <button className="btn-apple btn-apple-secondary" onClick={() => setMostrarForm(!mostrarForm)}>{mostrarForm ? 'Cancelar' : '+ Agregar'}</button>
      </div>

      {mostrarForm && (
        <div className="apple-card">
          <label className="apple-label">PROPIETARIO</label>
          <select className="apple-input mb-2" value={propietarioId ?? ''} onChange={(e) => setPropietarioId(Number(e.target.value) || null)}>
            <option value="">Sin propietario</option>
            {propietarios.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <label className="apple-label">MARCA Y MODELO</label>
          <input className="apple-input mb-2" value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="NISSAN NP300" />
          <div className="flex gap-2 mb-4">
            <input className="apple-input" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Color" />
            <input className="apple-input" value={placas} onChange={(e) => setPlacas(e.target.value)} placeholder="Placas" />
          </div>
          {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
          <button className="btn-apple btn-apple-primary w-full" onClick={guardar}>Guardar</button>
        </div>
      )}

      <div className="apple-card p-0 overflow-hidden">
        {unidades.map((u) => (
          <div key={u.id} className="apple-list-row">
            <div style={{ flex: 1 }}>
              <div className="apple-list-title">{u.marca_modelo} {u.color}</div>
              <div className="apple-list-subtitle">{u.placas} · {propietarios.find(p => p.id === u.propietario_id)?.nombre}</div>
            </div>
            <button className="btn-remove-punto" onClick={async () => { await eliminarUnidadFisica(u.id); await refrescar(); }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}