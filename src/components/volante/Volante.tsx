import { useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../lib/supabase';
import { AppleCard } from '../ui/AppleCard';
import { AppleInput } from '../ui/AppleInput';
import { GestionClientes } from './GestionClientes';
import type { ParadaVolante, Personal, UnidadFisica, EstadoServicio } from '../../types';

const formatearNombre = (nombre: string | undefined) => {
  if (!nombre) return '';
  return nombre.toUpperCase();
};

const ESTADOS: { value: EstadoServicio; label: string; color: string }[] = [
  { value: 'pendiente', label: '⏸ Pendiente', color: '#8E8E93' },
  { value: 'en_curso',  label: '▶ En Curso', color: '#34C759' },
  { value: 'finalizado', label: '✓ Finalizado', color: '#007AFF' },
  { value: 'cancelado', label: '✖ Cancelado', color: '#FF3B30' },
];

export function Volante() {
  const { 
    volante, volantesGuardados, addParada, updateParada, removeParada, 
    setFolioAdministrativo, setFechaRealizacion, setEstadoServicio, 
    updateUnidadVolante, guardarVolante, 
    cargarVolantes, cargarVolantePorId, nuevoVolante, clientes, cargarClientes,
    addClienteVolante, removeClienteVolante, togglePagado
  } = useAppStore();

  const [generandoImagen, setGenerandoImagen] = useState(false);
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [unidadesFisicas, setUnidadesFisicas] = useState<UnidadFisica[]>([]);
  const [editandoFolio, setEditandoFolio] = useState(false);
  const [mostrarClientes, setMostrarClientes] = useState(false);
  const [nuevoClienteInput, setNuevoClienteInput] = useState('');
  const [copiado, setCopiado] = useState(false);

  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cargarVolantes();
    cargarClientes();
    const fetchData = async () => {
      const { data: opData } = await supabase.from('personal').select('*').eq('activo', true);
      if (opData) setPersonal(opData);
      const { data: unData } = await supabase.from('unidades_fisicas').select('*').eq('activo', true);
      if (unData) setUnidadesFisicas(unData);
    };
    fetchData();
  }, [cargarVolantes, cargarClientes]);

  const handleAddParada = (tipo: ParadaVolante['tipo']) => {
    const nueva: ParadaVolante = {
      id_parada: `parada-${Date.now()}`,
      tipo,
      cliente_referencia: '',
      folio_fisico_cliente: '',
      folio_vinculado: '',
      ubicacion: '',
      fecha: volante.fecha_realizacion || new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hora_indefinida: false,
      detalle: '',
      unidad_fisica_id: null,
      operadores_ids: [],
      auxiliares_ids: []
    };
    addParada(nueva);
  };

  const guardarYCompartir = async () => {
    if (!summaryRef.current) return;
    setGenerandoImagen(true);
    
    try {
      const guardadoExitoso = await guardarVolante();
      if (!guardadoExitoso) {
        setGenerandoImagen(false);
        return; 
      }

      const dataUrl = await toPng(summaryRef.current, { quality: 1.0, pixelRatio: 2, backgroundColor: '#ffffff' });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `Volante-${volante.folio_administrativo || 'Nuevo'}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Volante ${volante.folio_administrativo}`,
          text: `Volante de Seguimiento - ${volante.clientes.join(', ')}`
        });
      } else {
        const link = document.createElement('a');
        link.download = file.name;
        link.href = dataUrl;
        link.click();
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error(error);
        alert('Error al generar la imagen');
      }
    } finally {
      setGenerandoImagen(false);
    }
  };

  const handleTogglePersonalParada = (paradaId: string, personaId: number, campo: 'operadores_ids' | 'auxiliares_ids') => {
    const parada = volante.itinerario.find(p => p.id_parada === paradaId);
    if (!parada) return;
    const actuales = parada[campo] || [];
    const nuevos = actuales.includes(personaId) ? actuales.filter(id => id !== personaId) : [...actuales, personaId];
    updateParada(paradaId, { [campo]: nuevos });
  };

  const usarPersonalPrincipal = (paradaId: string) => {
    const principal = volante.unidades_asignadas[0];
    if (!principal) return;
    updateParada(paradaId, {
      unidad_fisica_id: principal.unidad_fisica_id,
      operadores_ids: principal.operadores_ids,
      auxiliares_ids: principal.auxiliares_ids
    });
  };

  const handleAddCliente = () => {
    if (nuevoClienteInput.trim()) {
      addClienteVolante(nuevoClienteInput.trim().toUpperCase());
      setNuevoClienteInput('');
    }
  };

  const copiarParaExcel = () => {
    let descripcion = "";

    volante.itinerario.forEach((p) => {
      if (p.tipo === 'salida_base') return;

      let parte = "";
      const tipo = p.tipo.toUpperCase();
      const horaStr = p.hora_indefinida ? "(Indef.)" : `(${p.hora})`;
      const ubicacionStr = p.ubicacion || p.cliente_referencia || 'S/N';

      parte += `${tipo}: ${ubicacionStr} ${horaStr}`;
      
      if (p.detalle) parte += ` [${p.detalle}]`;

      if (descripcion !== "") descripcion += " -> ";
      descripcion += parte;
    });

    if (descripcion === "") descripcion = "Sin ruta registrada";

    const estadoPago = volante.pagado ? "LIQUIDADO" : "PENDIENTE DE PAGO";
    const textoFinal = `${descripcion} | ${estadoPago}`;

    navigator.clipboard.writeText(textoFinal).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }).catch(() => {
      alert("Error al copiar al portapapeles");
    });
  };

  const estadoActual = ESTADOS.find(e => e.value === volante.estado_servicio) || ESTADOS[0];

  return (
    <div style={{ paddingBottom: '100px' }}>
      
      <AppleCard style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Volante</h3>
            <select 
              className="input-apple" 
              style={{ width: 'auto', padding: '4px 8px', fontSize: '12px' }}
              onChange={(e) => {
                const v = volantesGuardados.find(vg => vg.id === Number(e.target.value));
                if (v) cargarVolantePorId(v);
              }}
              value={volante.id ?? ''}
            >
              <option value="">-- Historial --</option>
              {volantesGuardados.map(v => (
                <option key={v.id} value={v.id}>Folio {v.folio_administrativo} - {v.clientes.join(', ')}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-apple btn-secondary" onClick={copiarParaExcel} style={{ padding: '6px 12px', fontSize: '12px', background: copiado ? '#34C759' : '#E5E5EA', color: copiado ? '#fff' : '#007AFF', fontWeight: 600 }}>
              {copiado ? '✓ Copiado' : '📋 Copiar para Excel'}
            </button>
            <button className="btn-apple btn-secondary" onClick={nuevoVolante} style={{ padding: '6px 12px', fontSize: '12px' }}>+ Nuevo</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'gray', display: 'block', marginBottom: '4px' }}>Folio Administrativo</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" className="input-apple" value={volante.folio_administrativo} disabled={!editandoFolio}
                onChange={(e) => setFolioAdministrativo(e.target.value)}
                style={{ fontWeight: 900, fontSize: '24px', color: '#007AFF', background: editandoFolio ? '#fff' : '#eee' }}
              />
              <button onClick={() => setEditandoFolio(!editandoFolio)} style={{ padding: '0 12px', borderRadius: '8px', border: '1px solid #ccc', background: editandoFolio ? '#FF9500' : '#fff', cursor: 'pointer', fontWeight: 600 }}>
                {editandoFolio ? 'OK' : '✏️'}
              </button>
            </div>
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'gray', display: 'block', marginBottom: '4px' }}>Fecha de Realización</label>
            <input type="date" className="input-apple" value={volante.fecha_realizacion} onChange={(e) => setFechaRealizacion(e.target.value)} />
          </div>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'gray', marginBottom: '6px' }}>Estado del Servicio</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {ESTADOS.map(e => {
                const activo = volante.estado_servicio === e.value;
                return (
                  <button key={e.value} onClick={() => setEstadoServicio(e.value)} style={{ padding: '8px 12px', borderRadius: '20px', border: activo ? `2px solid ${e.color}` : '1px solid #ccc', background: activo ? e.color : 'transparent', color: activo ? '#fff' : '#333', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                    {e.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'gray', marginBottom: '6px' }}>Estado de Pago</p>
            <button 
              onClick={togglePagado}
              style={{ 
                width: '100%', padding: '12px', borderRadius: '12px', border: 'none', fontWeight: 800, fontSize: '16px', cursor: 'pointer',
                background: volante.pagado ? '#34C759' : '#FF3B30', color: '#fff',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
              }}
            >
              {volante.pagado ? '✅ LIQUIDADO' : '❌ PENDIENTE DE PAGO'}
            </button>
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'gray' }}>Clientes del Servicio</label>
            <button onClick={() => setMostrarClientes(true)} style={{ background: 'none', border: 'none', color: '#007AFF', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>⚙️ Catálogo</button>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input 
              type="text" list="clientes-list" className="input-apple" 
              value={nuevoClienteInput} onChange={(e) => setNuevoClienteInput(e.target.value.toUpperCase())} 
              placeholder="Escribe un cliente y presiona +..." 
              onKeyDown={(e) => e.key === 'Enter' && handleAddCliente()}
            />
            <datalist id="clientes-list">
              {clientes.map(c => <option key={c.id} value={c.nombre} />)}
            </datalist>
            <button onClick={handleAddCliente} style={{ background: '#007AFF', color: '#fff', border: 'none', borderRadius: '8px', padding: '0 16px', fontSize: '20px', cursor: 'pointer' }}>+</button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {volante.clientes.map((c, i) => (
              <div key={i} style={{ background: '#E5F1FF', color: '#007AFF', padding: '6px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {c}
                <button onClick={() => removeClienteVolante(i)} style={{ background: 'none', border: 'none', color: '#FF3B30', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
              </div>
            ))}
            {volante.clientes.length === 0 && <span style={{ fontSize: '12px', color: '#999' }}>No hay clientes agregados.</span>}
          </div>
        </div>
      </AppleCard>

      <AppleCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Unidades Principales</h3>
          <button 
            onClick={() => {
              const initId = `u-${Date.now()}`;
              useAppStore.setState({ volante: { ...volante, unidades_asignadas: [{ id: initId, unidad_fisica_id: null, operadores_ids: [], auxiliares_ids: [] }] } });
            }} 
            style={{ background: 'none', border: 'none', color: '#FF9500', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
          >
            Limpiar Todo 🗑️
          </button>
        </div>

        {volante.unidades_asignadas.map((u, i) => (
          <div key={u.id} style={{ marginBottom: '16px', padding: '16px', background: '#fafafa', borderRadius: '12px', border: '1px solid #eee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600 }}>Unidad {i + 1}</span>
            </div>
            <select className="input-apple" value={u.unidad_fisica_id ?? ''} onChange={(e) => updateUnidadVolante(u.id, { unidad_fisica_id: Number(e.target.value) || null })}>
              <option value="">Seleccionar unidad...</option>
              {unidadesFisicas.map(uf => <option key={uf.id} value={uf.id}>{uf.marca_modelo} - {uf.placas}</option>)}
            </select>
            
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'gray', marginTop: '12px', marginBottom: '4px' }}>Operadores</p>
            <div className="chip-container">
              {personal.filter(p => p.rol === 'chofer' || p.rol === 'ambos' || p.rol.toLowerCase().includes('chofer')).map(op => (
                <button key={op.id} className={`chip ${u.operadores_ids.includes(op.id) ? 'active' : ''}`} onClick={() => updateUnidadVolante(u.id, { operadores_ids: u.operadores_ids.includes(op.id) ? u.operadores_ids.filter(id => id !== op.id) : [...u.operadores_ids, op.id] })}>
                  {formatearNombre(op.nombre_completo)}
                </button>
              ))}
            </div>

            <p style={{ fontSize: '12px', fontWeight: 600, color: 'gray', marginTop: '12px', marginBottom: '4px' }}>Auxiliares</p>
            <div className="chip-container">
              {personal.filter(p => !u.operadores_ids.includes(p.id)).map(aux => (
                <button key={aux.id} className={`chip ${u.auxiliares_ids?.includes(aux.id) ? 'active' : ''}`} onClick={() => updateUnidadVolante(u.id, { auxiliares_ids: u.auxiliares_ids?.includes(aux.id) ? u.auxiliares_ids.filter(id => id !== aux.id) : [...(u.auxiliares_ids || []), aux.id] })}>
                  {formatearNombre(aux.nombre_completo)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </AppleCard>

      <AppleCard>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Timeline Logístico</h3>
        <div className="timeline-container">
          <div className="timeline-line"></div>
          {volante.itinerario.map((parada) => (
            <div key={parada.id_parada} className="timeline-node">
              <div className={`timeline-dot ${parada.tipo === 'salida_base' ? 'base' : ''}`}></div>
              <div className="timeline-content" style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #eee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: parada.tipo === 'salida_base' ? 'gray' : '#007AFF' }}>
                    {parada.tipo.toUpperCase().replace('_', ' ')}
                  </span>
                  {parada.tipo !== 'salida_base' && (
                    <button onClick={() => removeParada(parada.id_parada)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}>Eliminar 🗑️</button>
                  )}
                </div>
                
                <div style={{ display: 'grid', gap: '8px' }}>
                  {parada.tipo !== 'salida_base' && (
                    <>
                      <input 
                        type="text" list="clientes-list-parada" className="input-apple" 
                        value={parada.cliente_referencia} onChange={(e) => updateParada(parada.id_parada, { cliente_referencia: e.target.value.toUpperCase() })} 
                        placeholder="Cliente en esta parada" 
                      />
                      <datalist id="clientes-list-parada">
                        {clientes.map(c => <option key={c.id} value={c.nombre} />)}
                      </datalist>

                      <AppleInput placeholder="Ubicación" value={parada.ubicacion} onChange={(e) => updateParada(parada.id_parada, { ubicacion: e.target.value })} />
                      
                      <div style={{ padding: '12px', background: '#F2F2F7', borderRadius: '8px', marginTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <p style={{ fontSize: '11px', fontWeight: 600, color: 'gray' }}>Asignación para esta parada</p>
                          <button onClick={() => usarPersonalPrincipal(parada.id_parada)} style={{ background: 'none', border: 'none', color: '#007AFF', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Usar Principal ⬇️</button>
                        </div>
                        
                        <select className="input-apple" value={parada.unidad_fisica_id ?? ''} onChange={(e) => updateParada(parada.id_parada, { unidad_fisica_id: Number(e.target.value) || null })}>
                          <option value="">Seleccionar unidad...</option>
                          {unidadesFisicas.map(uf => <option key={uf.id} value={uf.id}>{uf.marca_modelo} - {uf.placas}</option>)}
                        </select>

                        <p style={{ fontSize: '10px', fontWeight: 600, color: 'gray', marginTop: '8px', marginBottom: '4px' }}>Operadores</p>
                        <div className="chip-container">
                          {personal.filter(p => p.rol === 'chofer' || p.rol === 'ambos' || p.rol.toLowerCase().includes('chofer')).map(op => (
                            <button key={op.id} className={`chip ${parada.operadores_ids?.includes(op.id) ? 'active' : ''}`} onClick={() => handleTogglePersonalParada(parada.id_parada, op.id, 'operadores_ids')} style={{ fontSize: '10px', padding: '4px 8px' }}>
                              {formatearNombre(op.nombre_completo)}
                            </button>
                          ))}
                        </div>

                        <p style={{ fontSize: '10px', fontWeight: 600, color: 'gray', marginTop: '8px', marginBottom: '4px' }}>Auxiliares</p>
                        <div className="chip-container">
                          {personal.filter(p => !parada.operadores_ids?.includes(p.id)).map(aux => (
                            <button key={aux.id} className={`chip ${parada.auxiliares_ids?.includes(aux.id) ? 'active' : ''}`} onClick={() => handleTogglePersonalParada(parada.id_parada, aux.id, 'auxiliares_ids')} style={{ fontSize: '10px', padding: '4px 8px' }}>
                              {formatearNombre(aux.nombre_completo)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                    <div>
                      <label style={{ fontSize: '10px', fontWeight: 600, color: 'gray', display: 'block', marginBottom: '2px' }}>Fecha</label>
                      <input type="date" className="input-apple" value={parada.fecha || ''} onChange={(e) => updateParada(parada.id_parada, { fecha: e.target.value })} style={{ padding: '8px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', fontWeight: 600, color: 'gray', display: 'block', marginBottom: '2px' }}>Hora</label>
                      {parada.hora_indefinida ? (
                        <div style={{ padding: '10px', background: '#FFF3CD', borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: '#856404', textAlign: 'center' }}>INDEFINIDA</div>
                      ) : (
                        <input type="time" className="input-apple" value={parada.hora || ''} onChange={(e) => updateParada(parada.id_parada, { hora: e.target.value })} style={{ padding: '8px' }} />
                      )}
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', fontWeight: 600, color: 'gray', display: 'block', marginBottom: '2px' }}>Detalle</label>
                      <AppleInput placeholder="Notas" value={parada.detalle} onChange={(e) => updateParada(parada.id_parada, { detalle: e.target.value })} />
                    </div>
                  </div>
                  
                  {parada.tipo !== 'salida_base' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#666', cursor: 'pointer', marginTop: '4px' }}>
                      <input type="checkbox" checked={!!parada.hora_indefinida} onChange={(e) => updateParada(parada.id_parada, { hora_indefinida: e.target.checked })} />
                      Hora indefinida
                    </label>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button className="btn-apple btn-secondary" style={{ flex: 1, padding: '10px 4px', fontSize: '13px' }} onClick={() => handleAddParada('carga')}>+ Carga</button>
          <button className="btn-apple btn-secondary" style={{ flex: 1, padding: '10px 4px', fontSize: '13px' }} onClick={() => handleAddParada('descarga')}>+ Descarga</button>
          <button className="btn-apple btn-secondary" style={{ flex: 1, padding: '10px 4px', fontSize: '13px' }} onClick={() => handleAddParada('interno')}>+ Interno</button>
        </div>
      </AppleCard>

      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={summaryRef} style={{ padding: '40px', width: '600px', background: '#fff', color: '#000', fontFamily: 'sans-serif' }}>
          <div style={{ background: '#000', color: '#fff', padding: '20px', textAlign: 'center', marginBottom: '20px', borderRadius: '12px' }}>
            <h1 style={{ margin: 0, fontSize: '48px', fontWeight: 'bold', letterSpacing: '2px' }}>FOLIO: {volante.folio_administrativo}</h1>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
              <p style={{ margin: 0, fontSize: '16px', background: estadoActual.color, padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold' }}>
                {estadoActual.label.toUpperCase()}
              </p>
              <p style={{ margin: 0, fontSize: '16px', background: volante.pagado ? '#34C759' : '#FF3B30', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold' }}>
                {volante.pagado ? 'LIQUIDADO' : 'PENDIENTE'}
              </p>
            </div>
          </div>

          <h2 style={{ textAlign: 'center', fontSize: '16px', color: '#666', marginBottom: '16px' }}>TRANSPORTES RAMÍREZ - VOLANTE DE SEGUIMIENTO</h2>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #007AFF' }}>
            <div><strong>Clientes:</strong> {volante.clientes.join(', ') || 'N/A'}</div>
            <div><strong>Fecha Realización:</strong> {volante.fecha_realizacion}</div>
          </div>

          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Unidades Principales</h3>
          {volante.unidades_asignadas.map(u => {
            const un = unidadesFisicas.find(uf => uf.id === u.unidad_fisica_id);
            const ops = u.operadores_ids.map(id => formatearNombre(personal.find(p => p.id === id)?.nombre_completo)).filter(Boolean);
            const auxs = (u.auxiliares_ids || []).map(id => formatearNombre(personal.find(p => p.id === id)?.nombre_completo)).filter(Boolean);
            return (
              <div key={u.id} style={{ marginBottom: '8px', fontSize: '14px' }}>
                <strong>Unidad:</strong> {un ? `${un.marca_modelo} (${un.placas})` : 'Sin asignar'} <br/>
                <strong>Operador:</strong> {ops.join(', ') || 'N/A'} <br/>
                {auxs.length > 0 && <><strong>Auxiliares:</strong> {auxs.join(', ')}</>}
              </div>
            );
          })}

          <h3 style={{ fontSize: '16px', marginBottom: '12px', marginTop: '24px' }}>Itinerario</h3>
          {volante.itinerario.map((p, i) => {
            const un = unidadesFisicas.find(uf => uf.id === p.unidad_fisica_id);
            const ops = p.operadores_ids?.map(id => formatearNombre(personal.find(per => per.id === id)?.nombre_completo)).filter(Boolean);
            const auxs = p.auxiliares_ids?.map(id => formatearNombre(personal.find(per => per.id === id)?.nombre_completo)).filter(Boolean);
            return (
              <div key={p.id_parada} style={{ marginBottom: '16px', paddingLeft: '16px', borderLeft: '3px solid #007AFF' }}>
                <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '4px' }}>{i + 1}. {p.tipo.toUpperCase().replace('_', ' ')}</div>
                <div style={{ fontSize: '13px', color: '#444' }}><strong>Fecha:</strong> {p.fecha || volante.fecha_realizacion} | <strong>Hora:</strong> {p.hora_indefinida ? 'INDEFINIDA' : p.hora}</div>
                {p.cliente_referencia && <div style={{ fontSize: '13px', color: '#444' }}><strong>Cliente:</strong> {p.cliente_referencia}</div>}
                {p.ubicacion && <div style={{ fontSize: '13px', color: '#444' }}><strong>Ubicación:</strong> {p.ubicacion}</div>}
                {p.tipo !== 'salida_base' && (
                  <div style={{ fontSize: '12px', color: '#007AFF', marginTop: '4px' }}>
                    <strong>Asignado:</strong> {un ? `${un.marca_modelo} (${un.placas})` : 'N/A'} <br/>
                    <strong>Operador:</strong> {ops?.join(', ') || 'N/A'} <br/>
                    {auxs && auxs.length > 0 && <><strong>Auxiliares:</strong> {auxs.join(', ')}</>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: '16px', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 100, padding: '0 16px' }}>
        <div style={{ display: 'flex', background: '#fff', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', overflow: 'hidden', width: '100%', maxWidth: '500px' }}>
          <button onClick={() => guardarVolante()} disabled={generandoImagen} style={{ flex: 1, padding: '16px', border: 'none', background: generandoImagen ? '#999' : '#007AFF', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: generandoImagen ? 'not-allowed' : 'pointer' }}>
            <span style={{ fontSize: '20px', marginBottom: '4px' }}>💾</span>
            <span style={{ fontSize: '13px', fontWeight: 700 }}>Guardar</span>
          </button>
          <div style={{ width: '1px', background: 'rgba(0,0,0,0.1)' }}></div>
          <button onClick={guardarYCompartir} disabled={generandoImagen} style={{ flex: 1, padding: '16px', border: 'none', background: generandoImagen ? '#999' : '#34C759', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: generandoImagen ? 'not-allowed' : 'pointer' }}>
            <span style={{ fontSize: '20px', marginBottom: '4px' }}>📸</span>
            <span style={{ fontSize: '13px', fontWeight: 700 }}>{generandoImagen ? 'Procesando...' : 'Guardar y Enviar'}</span>
          </button>
        </div>
      </div>

      {mostrarClientes && <GestionClientes onClose={() => setMostrarClientes(false)} />}
    </div>
  );
}