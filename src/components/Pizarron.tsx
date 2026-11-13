import { useState, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { AppleCard } from './ui/AppleCard';
import { AppleInput } from './ui/AppleInput';
import type { Personal, UnidadFisica } from '../types';

interface ServicioTentativo {
  id: number;
  fecha: string;
  cliente: string;
  origen: string;
  destino: string;
  notas: string;
  estado: string;
  pagado: boolean;
  unidad_id: number | null;
  operador_id: number | null;
  auxiliar_ids: number[];
  hora_carga: string;
  hora_carga_indefinida: boolean;
  hora_descarga: string;
  hora_descarga_indefinida: boolean;
}

const CONECTORES = ['de', 'del', 'la', 'las', 'los', 'el', 'y', 'en', 'con', 'para', 'por', 'a', 'ante', 'bajo', 'contra', 'desde', 'entre', 'hacia', 'hasta', 'según', 'sin', 'sobre', 'tras'];

const formatearTexto = (texto: string, esUbicacion: boolean = false) => {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .split(' ')
    .map((palabra, index) => {
      if (!palabra) return '';
      if (esUbicacion && index > 0 && CONECTORES.includes(palabra)) return palabra;
      return palabra.charAt(0).toUpperCase() + palabra.slice(1);
    })
    .join(' ');
};

export function Pizarron() {
  const { agregarCliente, clientes, cargarClientes, nuevoVolante } = useAppStore();
  const [servicios, setServicios] = useState<ServicioTentativo[]>([]);
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [unidades, setUnidades] = useState<UnidadFisica[]>([]);
  const [cargando, setCargando] = useState(false);
  
  const pizarronRef = useRef<HTMLDivElement>(null);

  const [nuevo, setNuevo] = useState({
    fecha: new Date().toISOString().split('T')[0],
    cliente: '',
    origen: '',
    destino: '',
    notas: '',
    unidad_id: null as number | null,
    operador_id: null as number | null,
    auxiliar_ids: [] as number[],
    hora_carga: '08:00',
    hora_carga_indefinida: false,
    hora_descarga: '14:00',
    hora_descarga_indefinida: false,
  });

  useEffect(() => {
    cargarClientes();
    fetchData();
    cargarServicios();
  }, []);

  const fetchData = async () => {
    const { data: opData } = await supabase.from('personal').select('*').eq('activo', true);
    if (opData) setPersonal(opData);
    const { data: unData } = await supabase.from('unidades_fisicas').select('*').eq('activo', true);
    if (unData) setUnidades(unData);
  };

  const cargarServicios = async () => {
    const { data } = await supabase
      .from('pizarron_tentativo')
      .select('*')
      .order('fecha', { ascending: true });
    if (data) setServicios(data);
  };

  const agregarServicio = async () => {
    if (!nuevo.cliente.trim() && !nuevo.origen.trim()) {
      alert('Agrega al menos un cliente o una ruta');
      return;
    }
    setCargando(true);
    
    if (nuevo.cliente.trim()) {
      await agregarCliente(nuevo.cliente.trim());
    }

    const { error } = await supabase.from('pizarron_tentativo').insert([{
      ...nuevo,
      estado: 'Tentativo',
      pagado: false,
    }]);

    setCargando(false);
    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      setNuevo({ 
        ...nuevo, 
        cliente: '', origen: '', destino: '', notas: '', 
        unidad_id: null, operador_id: null, auxiliar_ids: [] 
      });
      cargarServicios();
    }
  };

  const actualizarServicio = async (id: number, campo: string, valor: any) => {
    let valorFinal = valor;
    if (typeof valor === 'string') {
      if (campo === 'cliente') valorFinal = formatearTexto(valor);
      if (campo === 'origen' || campo === 'destino') valorFinal = formatearTexto(valor, true);
    }
    setServicios(prev => prev.map(s => s.id === id ? { ...s, [campo]: valorFinal } : s));
    await supabase.from('pizarron_tentativo').update({ [campo]: valorFinal }).eq('id', id);
  };

  const toggleAuxiliar = async (id: number, auxId: number, actuales: number[]) => {
    const nuevos = actuales.includes(auxId) ? actuales.filter(a => a !== auxId) : [...actuales, auxId];
    actualizarServicio(id, 'auxiliar_ids', nuevos);
  };

  const togglePagado = (id: number, actual: boolean) => {
    actualizarServicio(id, 'pagado', !actual);
  };

  const eliminarServicio = async (id: number) => {
    if (!confirm('¿Borrar este servicio del pizarrón?')) return;
    await supabase.from('pizarron_tentativo').delete().eq('id', id);
    cargarServicios();
  };

  const compartirTodoTexto = () => {
    if (servicios.length === 0) return alert('No hay servicios para compartir');

    let texto = `*PIZARRÓN DE SERVICIOS - TRANSPORTES RAMÍREZ*\n\n`;

    servicios.forEach(s => {
      const un = unidades.find(u => u.id === s.unidad_id);
      const op = personal.find(p => p.id === s.operador_id);
      const auxs = (s.auxiliar_ids || []).map(id => personal.find(p => p.id === id)?.nombre_completo.split(' ')[0]).filter(Boolean);

      texto += `*${s.fecha}* | ${s.estado.toUpperCase()}\n`;
      if (s.pagado) texto += `✅ *LIQUIDADO*\n`; else texto += `❌ *PENDIENTE*\n`;
      if (s.cliente) texto += `*Cliente(s):* ${s.cliente}\n`;
      if (s.origen || s.destino) texto += `*Ruta:* ${s.origen} a ${s.destino}\n`;
      if (un) texto += `*Unidad:* ${un.marca_modelo} (${un.placas})\n`;
      if (op) texto += `*Operador:* ${op.nombre_completo}\n`;
      if (auxs.length > 0) texto += `*Auxiliares:* ${auxs.join(', ')}\n`;
      
      const hc = s.hora_carga_indefinida ? 'INDEFINIDA' : s.hora_carga;
      const hd = s.hora_descarga_indefinida ? 'INDEFINIDA' : s.hora_descarga;
      texto += `*Carga:* ${hc} | *Descarga:* ${hd}\n`;
      
      if (s.notas) texto += `*Notas:* ${s.notas}\n`;
      texto += `\n`;
    });

    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const compartirIndividual = (s: ServicioTentativo) => {
    const un = unidades.find(u => u.id === s.unidad_id);
    const op = personal.find(p => p.id === s.operador_id);
    const auxs = (s.auxiliar_ids || []).map(id => personal.find(p => p.id === id)?.nombre_completo.split(' ')[0]).filter(Boolean);

    let texto = `🚛 *TRANSPORTES RAMÍREZ*\n`;
    texto += `_Servicio Programado_\n\n`;
    texto += `📅 *Fecha:* ${s.fecha}\n`;
    if (s.pagado) texto += `✅ *LIQUIDADO*\n`; else texto += `❌ *PENDIENTE*\n`;
    if (s.cliente) texto += `👤 *Cliente(s):* ${s.cliente}\n`;
    if (s.origen || s.destino) texto += `📍 *Ruta:* ${s.origen} a ${s.destino}\n`;
    if (un) texto += `🚚 *Unidad:* ${un.marca_modelo} (${un.placas})\n`;
    if (op) texto += `👤 *Operador:* ${op.nombre_completo}\n`;
    if (auxs.length > 0) texto += `🔧 *Auxiliares:* ${auxs.join(', ')}\n`;
    
    const hc = s.hora_carga_indefinida ? 'INDEFINIDA' : s.hora_carga;
    const hd = s.hora_descarga_indefinida ? 'INDEFINIDA' : s.hora_descarga;
    texto += `⏰ *Carga:* ${hc} | *Descarga:* ${hd}\n`;
    
    if (s.notas) texto += `📝 *Notas:* ${s.notas}\n`;

    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const compartirImagen = async () => {
    if (!pizarronRef.current) return;
    try {
      const dataUrl = await toPng(pizarronRef.current, { quality: 1.0, pixelRatio: 2, backgroundColor: '#ffffff' });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `Pizarron-${new Date().toISOString().split('T')[0]}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Pizarrón de Servicios' });
      } else {
        const link = document.createElement('a');
        link.download = file.name;
        link.href = dataUrl;
        link.click();
      }
    } catch (error) {
      alert('Error al generar imagen');
    }
  };

  const enviarAVolante = (s: ServicioTentativo) => {
    nuevoVolante();
    
    const clientesArr = s.cliente ? s.cliente.split(',').map(c => c.trim().toUpperCase()) : [];
    
    useAppStore.setState(state => ({
      volante: {
        ...state.volante,
        fecha_realizacion: s.fecha,
        clientes: clientesArr,
        pagado: s.pagado,
        itinerario: [
          { id_parada: 'base-1', tipo: 'salida_base', cliente_referencia: 'Salida de Base', ubicacion: 'Base Central', fecha: s.fecha, hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), detalle: 'Inicio de viaje' },
          { id_parada: `carga-${Date.now()}`, tipo: 'carga', cliente_referencia: clientesArr[0] || '', ubicacion: s.origen, fecha: s.fecha, hora: s.hora_carga || '08:00', hora_indefinida: s.hora_carga_indefinida, detalle: s.notas },
          { id_parada: `descarga-${Date.now()}`, tipo: 'descarga', cliente_referencia: clientesArr[clientesArr.length-1] || '', ubicacion: s.destino, fecha: s.fecha, hora: s.hora_descarga || '14:00', hora_indefinida: s.hora_descarga_indefinida, detalle: s.notas }
        ]
      }
    }));

    useAppStore.setState(state => ({
      volante: {
        ...state.volante,
        unidades_asignadas: [{
          id: `u-${Date.now()}`,
          unidad_fisica_id: s.unidad_id,
          operadores_ids: s.operador_id ? [s.operador_id] : [],
          auxiliares_ids: s.auxiliar_ids || []
        }]
      }
    }));

    alert('✅ Datos enviados al Volante correctamente. Ve a la pestaña "Volante" para revisar y guardar.');
  };

  const operadoresDisponibles = personal.filter(p => {
    const rol = (p.rol || '').toLowerCase();
    return rol.includes('chofer') || rol.includes('ambos') || rol.includes('operador') || rol === '';
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '100px' }}>
      
      <AppleCard>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Anotar en Pizarrón</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px' }}>
            <AppleInput type="date" value={nuevo.fecha} onChange={(e) => setNuevo({ ...nuevo, fecha: e.target.value })} />
            <input 
              type="text" list="clientes-list-pizarron" className="input-apple" 
              value={nuevo.cliente} onChange={(e) => setNuevo({ ...nuevo, cliente: formatearTexto(e.target.value) })} 
              placeholder="Cliente(s)" 
            />
            <datalist id="clientes-list-pizarron">
              {clientes.map(c => <option key={c.id} value={c.nombre} />)}
            </datalist>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <AppleInput placeholder="Origen" value={nuevo.origen} onChange={(e) => setNuevo({ ...nuevo, origen: formatearTexto(e.target.value, true) })} />
            <AppleInput placeholder="Destino" value={nuevo.destino} onChange={(e) => setNuevo({ ...nuevo, destino: formatearTexto(e.target.value, true) })} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <select className="input-apple" value={nuevo.unidad_id ?? ''} onChange={(e) => setNuevo({ ...nuevo, unidad_id: Number(e.target.value) || null })}>
              <option value="">Asignar Unidad...</option>
              {unidades.map(u => <option key={u.id} value={u.id}>{u.marca_modelo} - {u.placas}</option>)}
            </select>
            <select className="input-apple" value={nuevo.operador_id ?? ''} onChange={(e) => setNuevo({ ...nuevo, operador_id: Number(e.target.value) || null })}>
              <option value="">Asignar Operador...</option>
              {operadoresDisponibles.map(op => <option key={op.id} value={op.id}>{op.nombre_completo}</option>)}
            </select>
          </div>

          <div style={{ background: '#F2F2F7', padding: '8px', borderRadius: '8px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'gray', marginBottom: '6px' }}>Seleccionar Auxiliares:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {personal.filter(p => p.id !== nuevo.operador_id).map(aux => (
                <button
                  key={aux.id}
                  onClick={() => {
                    const actuales = nuevo.auxiliar_ids;
                    const nuevos = actuales.includes(aux.id) ? actuales.filter(a => a !== aux.id) : [...actuales, aux.id];
                    setNuevo({ ...nuevo, auxiliar_ids: nuevos });
                  }}
                  style={{
                    padding: '4px 8px', borderRadius: '12px', fontSize: '11px', border: '1px solid #ccc',
                    background: nuevo.auxiliar_ids.includes(aux.id) ? '#34C759' : '#fff',
                    color: nuevo.auxiliar_ids.includes(aux.id) ? '#fff' : '#333'
                  }}
                >
                  {aux.nombre_completo.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', alignItems: 'center', background: '#f9f9f9', padding: '8px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600 }}>Carga:</span>
              <input type="time" className="input-apple" disabled={nuevo.hora_carga_indefinida} value={nuevo.hora_carga} onChange={(e) => setNuevo({ ...nuevo, hora_carga: e.target.value })} />
              <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input type="checkbox" checked={nuevo.hora_carga_indefinida} onChange={(e) => setNuevo({ ...nuevo, hora_carga_indefinida: e.target.checked })} /> Indef.
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600 }}>Desc:</span>
              <input type="time" className="input-apple" disabled={nuevo.hora_descarga_indefinida} value={nuevo.hora_descarga} onChange={(e) => setNuevo({ ...nuevo, hora_descarga: e.target.value })} />
              <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input type="checkbox" checked={nuevo.hora_descarga_indefinida} onChange={(e) => setNuevo({ ...nuevo, hora_descarga_indefinida: e.target.checked })} /> Indef.
              </label>
            </div>
          </div>

          <AppleInput placeholder="Notas rápidas (opcional)" value={nuevo.notas} onChange={(e) => setNuevo({ ...nuevo, notas: e.target.value })} />

          <button className="btn-apple" onClick={agregarServicio} disabled={cargando} style={{ background: '#007AFF', color: '#fff', fontWeight: 700, marginTop: '8px' }}>
            {cargando ? 'Guardando...' : '+ Agregar al Pizarrón'}
          </button>
        </div>
      </AppleCard>

      <AppleCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Servicios Tentativos</h3>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={compartirTodoTexto} style={{ padding: '8px 12px', background: '#25D366', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
              Enviar Todo
            </button>
            <button onClick={compartirImagen} style={{ padding: '8px 12px', background: '#007AFF', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
              Imagen
            </button>
          </div>
        </div>

        <div ref={pizarronRef} style={{ overflowX: 'auto', padding: '10px', background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #007AFF', background: '#f9f9f9' }}>
                <th style={{ padding: '12px 8px' }}>Fecha</th>
                <th style={{ padding: '12px 8px' }}>Cliente / Ruta</th>
                <th style={{ padding: '12px 8px' }}>Unidad / Personal</th>
                <th style={{ padding: '12px 8px' }}>Horas</th>
                <th className="no-print" style={{ padding: '12px 8px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {servicios.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#666' }}>No hay servicios en el pizarrón.</td>
                </tr>
              ) : (
                servicios.map((s) => {
                  const op = personal.find(p => p.id === s.operador_id);
                  const auxs = (s.auxiliar_ids || []).map(id => personal.find(p => p.id === id)).filter(Boolean);

                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{s.fecha}</td>
                      
                      <td style={{ padding: '8px' }}>
                        <div style={{ fontWeight: 600 }}>{s.cliente || '-'}</div>
                        {/* AQUÍ ESTÁ LA CORRECCIÓN DE LA FLECHA */}
                        <div style={{ fontSize: '11px', color: '#666' }}>{s.origen} {'->'} {s.destino}</div>
                        {s.notas && <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>{s.notas}</div>}
                      </td>
                      
                      <td style={{ padding: '8px' }}>
                        <select className="input-apple no-print" style={{ padding: '4px', fontSize: '11px', marginBottom: '4px', width: '100%' }} value={s.unidad_id ?? ''} onChange={(e) => actualizarServicio(s.id, 'unidad_id', Number(e.target.value) || null)}>
                          <option value="">Sin unidad</option>
                          {unidades.map(u => <option key={u.id} value={u.id}>{u.marca_modelo}</option>)}
                        </select>
                        
                        <select className="input-apple no-print" style={{ padding: '4px', fontSize: '11px', marginBottom: '4px', width: '100%' }} value={s.operador_id ?? ''} onChange={(e) => actualizarServicio(s.id, 'operador_id', Number(e.target.value) || null)}>
                          <option value="">Sin operador</option>
                          {operadoresDisponibles.map(o => <option key={o.id} value={o.id}>{o.nombre_completo.split(' ')[0]}</option>)}
                        </select>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {auxs.map(aux => (
                            <span key={aux!.id} style={{ fontSize: '10px', background: '#E5F1FF', color: '#007AFF', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              {aux!.nombre_completo.split(' ')[0]}
                              <button className="no-print" onClick={() => toggleAuxiliar(s.id, aux!.id, s.auxiliar_ids || [])} style={{ background: 'none', border: 'none', color: 'red', marginLeft: '4px', cursor: 'pointer', padding: 0 }}>x</button>
                            </span>
                          ))}
                          <select className="no-print" style={{ padding: '2px', fontSize: '10px', border: 'none', background: 'transparent', color: '#007AFF', cursor: 'pointer' }} onChange={(e) => { if(e.target.value) { toggleAuxiliar(s.id, Number(e.target.value), s.auxiliar_ids || []); e.target.value = ""; } }}>
                            <option value="">+ Aux</option>
                            {personal.filter(p => p.id !== s.operador_id && !(s.auxiliar_ids || []).includes(p.id)).map(a => (
                              <option key={a.id} value={a.id}>{a.nombre_completo.split(' ')[0]}</option>
                            ))}
                          </select>
                        </div>
                      </td>

                      <td style={{ padding: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 600 }}>C:</span>
                          {s.hora_carga_indefinida ? <span style={{ fontSize: '11px', color: '#FF9500', fontWeight: 700 }}>INDEF.</span> : <input type="time" className="no-print" style={{ padding: '2px', fontSize: '11px', border: '1px solid #ccc', borderRadius: '4px' }} value={s.hora_carga || ''} onChange={(e) => actualizarServicio(s.id, 'hora_carga', e.target.value)} />}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 600 }}>D:</span>
                          {s.hora_descarga_indefinida ? <span style={{ fontSize: '11px', color: '#FF9500', fontWeight: 700 }}>INDEF.</span> : <input type="time" className="no-print" style={{ padding: '2px', fontSize: '11px', border: '1px solid #ccc', borderRadius: '4px' }} value={s.hora_descarga || ''} onChange={(e) => actualizarServicio(s.id, 'hora_descarga', e.target.value)} />}
                        </div>
                        <select
                          className="no-print"
                          value={s.estado}
                          onChange={(e) => actualizarServicio(s.id, 'estado', e.target.value)}
                          style={{
                            marginTop: '6px', padding: '2px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '10px', fontWeight: 600,
                            background: s.estado === 'Confirmado' ? '#DCF8C6' : s.estado === 'Cancelado' ? '#FFD2D2' : '#FFF3CD',
                          }}
                        >
                          <option value="Tentativo">Tentativo</option>
                          <option value="Confirmado">Confirmado</option>
                          <option value="Cancelado">Cancelado</option>
                        </select>
                      </td>

                      <td className="no-print" style={{ padding: '8px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <button onClick={() => togglePagado(s.id, s.pagado)} style={{ background: s.pagado ? '#34C759' : '#FF3B30', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>
                          {s.pagado ? 'LIQUIDADO' : 'PENDIENTE'}
                        </button>
                        <button onClick={() => compartirIndividual(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} title="Compartir WhatsApp">💬</button>
                        <button onClick={() => enviarAVolante(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} title="Enviar a Volante">📤</button>
                        <button onClick={() => eliminarServicio(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} title="Eliminar">🗑️</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </AppleCard>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff; }
          .apple-card { box-shadow: none !important; border: none !important; padding: 0 !important; }
          table { font-size: 12px !important; }
          th, td { padding: 8px !important; border-bottom: 1px solid #ccc !important; }
          .apple-card:first-child { display: none !important; }
        }
      `}</style>
    </div>
  );
}