import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../lib/supabase';
import { AppleCard } from '../ui/AppleCard';

interface Operador {
  id: number;
  nombre_completo: string;
  apodo: string | null;
  rol: string;
}

interface UnidadFisica {
  id: number;
  marca_modelo: string;
  placas: string;
}

export function CentroMando() {
  const { despacho, addAsignacion, updateAsignacion, removeAsignacion } = useAppStore();
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [unidades, setUnidades] = useState<UnidadFisica[]>([]);
  const [mensajeWa, setMensajeWa] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const { data: opData } = await supabase.from('personal').select('id, nombre_completo, apodo, rol').eq('activo', true);
      if (opData) setOperadores(opData);

      const { data: unData } = await supabase.from('unidades_fisicas').select('id, marca_modelo, placas').eq('activo', true);
      if (unData) setUnidades(unData);
    };
    fetchData();
  }, []);

  const handleToggleOperador = (asigId: string, opId: number) => {
    const asignacion = despacho.asignaciones.find(a => a.id === asigId);
    if (!asignacion) return;

    let nuevosOperadores = [...asignacion.operadores_ids];
    if (nuevosOperadores.includes(opId)) {
      nuevosOperadores = nuevosOperadores.filter(id => id !== opId);
    } else {
      nuevosOperadores.push(opId);
    }
    updateAsignacion(asigId, { operadores_ids: nuevosOperadores });
  };

  const handleToggleAuxiliar = (asigId: string, auxId: number) => {
    const asignacion = despacho.asignaciones.find(a => a.id === asigId);
    if (!asignacion) return;

    let nuevosAuxiliares = [...asignacion.auxiliares_ids];
    if (nuevosAuxiliares.includes(auxId)) {
      nuevosAuxiliares = nuevosAuxiliares.filter(id => id !== auxId);
    } else {
      nuevosAuxiliares.push(auxId);
    }
    updateAsignacion(asigId, { auxiliares_ids: nuevosAuxiliares });
  };

  const generarWhatsApp = () => {
    let texto = `*ASIGNACIÓN DE UNIDADES*\n\n`;

    despacho.asignaciones.forEach((asig, index) => {
      const unidad = unidades.find(u => u.id === asig.unidad_fisica_id);
      
      const nombresOps = asig.operadores_ids.map(id => operadores.find(o => o.id === id)?.nombre_completo).filter(Boolean);
      const nombresAux = asig.auxiliares_ids.map(id => operadores.find(o => o.id === id)?.nombre_completo).filter(Boolean);

      texto += `*Unidad ${index + 1}:* ${unidad ? `${unidad.marca_modelo} (${unidad.placas})` : 'Sin asignar'}\n`;
      if (nombresOps.length > 0) texto += `*Operador(es):* ${nombresOps.join(', ')}\n`;
      if (nombresAux.length > 0) texto += `*Auxiliares:* ${nombresAux.join(', ')}\n`;
      texto += `\n`;
    });

    setMensajeWa(texto);
  };

  return (
    <div>
      {despacho.asignaciones.map((asig, index) => {
        const operadoresFiltrados = operadores.filter(o => o.rol === 'chofer' || o.rol === 'ambos');
        const auxiliaresFiltrados = operadores.filter(o => o.rol === 'auxiliar' || o.rol === 'ambos');

        return (
          <AppleCard key={asig.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Unidad {index + 1}</h3>
              {despacho.asignaciones.length > 1 && (
                <button className="btn-apple btn-danger" style={{ padding: '8px 12px', minHeight: 'auto' }} onClick={() => removeAsignacion(asig.id)}>Eliminar</button>
              )}
            </div>

            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Unidad Física</label>
            <select 
              className="input-apple" 
              value={asig.unidad_fisica_id || ''}
              onChange={(e) => updateAsignacion(asig.id, { unidad_fisica_id: Number(e.target.value) || null })}
              style={{ marginBottom: '16px' }}
            >
              <option value="">Seleccionar unidad...</option>
              {unidades.map(u => <option key={u.id} value={u.id}>{u.marca_modelo} - {u.placas}</option>)}
            </select>

            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Operadores (Titular y Segundo)</label>
            <div className="chip-container" style={{ marginBottom: '16px' }}>
              {operadoresFiltrados.map(op => {
                const isActive = asig.operadores_ids.includes(op.id);
                const displayName = op.apodo ? `${op.nombre_completo} (${op.apodo})` : op.nombre_completo;
                return (
                  <button key={op.id} className={`chip ${isActive ? 'active' : ''}`} onClick={() => handleToggleOperador(asig.id, op.id)}>
                    {displayName}
                  </button>
                );
              })}
            </div>

            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Auxiliares (Opcional)</label>
            <div className="chip-container">
              {auxiliaresFiltrados.map(aux => {
                const isActive = asig.auxiliares_ids.includes(aux.id);
                const displayName = aux.apodo ? `${aux.nombre_completo} (${aux.apodo})` : aux.nombre_completo;
                return (
                  <button key={aux.id} className={`chip ${isActive ? 'active' : ''}`} onClick={() => handleToggleAuxiliar(asig.id, aux.id)}>
                    {displayName}
                  </button>
                );
              })}
            </div>
          </AppleCard>
        );
      })}

      <button className="btn-apple btn-secondary" style={{ width: '100%', marginBottom: '24px' }} onClick={addAsignacion}>
        + Agregar otra Unidad
      </button>

      <div className="btn-floating" onClick={generarWhatsApp} style={{ background: 'rgba(52, 199, 89, 0.85)', boxShadow: '0 10px 30px rgba(52, 199, 89, 0.4)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '12px', opacity: 0.8, fontWeight: 500 }}>EXPORTAR</div>
          <div style={{ fontSize: '20px', fontWeight: 800 }}>Enviar Asignación</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.2)', padding: '8px 16px', borderRadius: '12px' }}>
          <span style={{ fontSize: '20px' }}>💬</span>
          <span style={{ fontWeight: 600 }}>WhatsApp</span>
        </div>
      </div>

      {mensajeWa && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '16px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', background: '#fff' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Vista Previa WhatsApp</h3>
            <pre style={{ whiteSpace: 'pre-wrap', background: '#e5e5ea', padding: '16px', borderRadius: '12px', fontSize: '14px', fontFamily: 'inherit', marginBottom: '16px' }}>
              {mensajeWa}
            </pre>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-apple btn-secondary" style={{ flex: 1 }} onClick={() => setMensajeWa('')}>Cerrar</button>
              <a href={`https://wa.me/?text=${encodeURIComponent(mensajeWa)}`} target="_blank" rel="noreferrer" className="btn-apple btn-primary" style={{ flex: 1, textDecoration: 'none' }}>Abrir WhatsApp</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}