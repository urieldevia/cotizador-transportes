import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { AppleInput } from '../ui/AppleInput';

interface Props {
  onClose: () => void;
}

export function GestionClientes({ onClose }: Props) {
  const { clientes, editarCliente, eliminarCliente } = useAppStore();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [filtro, setFiltro] = useState('');

  const handleEdit = (id: number, nombre: string) => {
    setEditingId(id);
    setEditNombre(nombre);
  };

  const handleSave = async () => {
    if (editingId) {
      await editarCliente(editingId, editNombre);
      setEditingId(null);
    }
  };

  const f = filtro.toLowerCase();
  const filtrados = clientes.filter(c => c.nombre.toLowerCase().includes(f));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '400px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Catálogo de Clientes</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
          <AppleInput placeholder="🔍 Buscar cliente..." value={filtro} onChange={(e) => setFiltro(e.target.value)} />
          
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtrados.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F9F9F9', padding: '10px', borderRadius: '8px', border: '1px solid #eee' }}>
                {editingId === c.id ? (
                  <>
                    <AppleInput value={editNombre} onChange={(e) => setEditNombre(e.target.value)} />
                    <button onClick={handleSave} style={{ background: '#34C759', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 600 }}>OK</button>
                    <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', color: 'red', fontWeight: 600 }}>X</button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, fontWeight: 500 }}>{c.nombre}</span>
                    <button onClick={() => handleEdit(c.id, c.nombre)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✏️</button>
                    <button onClick={() => { if(confirm('¿Eliminar este cliente?')) eliminarCliente(c.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'red' }}>🗑️</button>
                  </>
                )}
              </div>
            ))}
            {filtrados.length === 0 && <p style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>No hay clientes registrados.</p>}
          </div>
        </div>

      </div>
    </div>
  );
}