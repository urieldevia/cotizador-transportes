import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { AppleInput } from '../ui/AppleInput';
import type { Personal, UnidadFisica } from '../../types';

interface Props {
  onClose: () => void;
  onRefresh: () => Promise<void>;
  personal: Personal[];
  unidades: UnidadFisica[];
}

const DOCS_EMPRESA = [
  { id: 'sua', label: 'SUA (Mensual)' },
  { id: 'linea_captura', label: 'Línea de Captura' },
  { id: 'comprobante_pago', label: 'Comprobante de Pago' },
];

export function GestionRecursos({ onClose, onRefresh, personal, unidades }: Props) {
  const [tab, setTab] = useState<'unidades' | 'personal' | 'empresa'>('unidades');
  const [cargando, setCargando] = useState(false);
  const [filtro, setFiltro] = useState('');

  const [editingU, setEditingU] = useState<any | null>(null);
  const [editingP, setEditingP] = useState<any | null>(null);
  
  const [docsEmpresa, setDocsEmpresa] = useState<Record<string, string | null>>({});

  const [nuevaUnidad, setNuevaUnidad] = useState({ marca_modelo: '', placas: '', color: '' });
  const [nuevoPersonal, setNuevoPersonal] = useState({ nombre_completo: '', apodo: '', rol: 'chofer', telefono: '' });

  useEffect(() => {
    const fetchDocsEmpresa = async () => {
      const { data } = await supabase.from('documentos_empresa').select('tipo, path');
      if (data) {
        const paths: Record<string, string | null> = {};
        data.forEach(d => { paths[d.tipo] = d.path; });
        setDocsEmpresa(paths);
      }
    };
    fetchDocsEmpresa();
  }, []);

  const subirDocumentoUnidad = async (file: File, tipo: 'poliza' | 'fumigacion') => {
    if (!editingU) return;
    setCargando(true);
    try {
      const nombreLimpio = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const path = `unidades/${editingU.id}/${tipo}-${Date.now()}-${nombreLimpio}`;
      const { error } = await supabase.storage.from('documentos_despacho').upload(path, file);
      if (error) throw error;
      setEditingU({ ...editingU, [`${tipo}_path`]: path });
    } catch (err: any) {
      alert('Error al subir: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  const eliminarDocumentoUnidad = async (tipo: 'poliza' | 'fumigacion') => {
    if (!editingU) return;
    const path = editingU[`${tipo}_path`];
    if (!path) return;
    if (!confirm(`¿Eliminar archivo?`)) return;
    setCargando(true);
    await supabase.storage.from('documentos_despacho').remove([path]);
    setEditingU({ ...editingU, [`${tipo}_path`]: null });
    setCargando(false);
  };

  const subirDocumentoPersonal = async (file: File, tipo: 'ine' | 'licencia') => {
    if (!editingP) return;
    setCargando(true);
    try {
      const nombreLimpio = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const path = `expedientes/${editingP.id}/${tipo}-${Date.now()}-${nombreLimpio}`;
      const { error } = await supabase.storage.from('documentos_despacho').upload(path, file);
      if (error) throw error;
      setEditingP({ ...editingP, [`${tipo}_path`]: path });
    } catch (err: any) {
      alert('Error al subir: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  const eliminarDocumentoPersonal = async (tipo: 'ine' | 'licencia') => {
    if (!editingP) return;
    const path = editingP[`${tipo}_path`];
    if (!path) return;
    if (!confirm(`¿Eliminar archivo?`)) return;
    setCargando(true);
    await supabase.storage.from('documentos_despacho').remove([path]);
    setEditingP({ ...editingP, [`${tipo}_path`]: null });
    setCargando(false);
  };

  const subirDocumentoEmpresa = async (file: File, tipo: string) => {
    setCargando(true);
    try {
      const nombreLimpio = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const path = `empresa/${tipo}-${Date.now()}-${nombreLimpio}`;
      
      const { error } = await supabase.storage.from('documentos_despacho').upload(path, file);
      if (error) throw error;

      await supabase.from('documentos_empresa').upsert({ tipo, path, updated_at: new Date().toISOString() });
      setDocsEmpresa(prev => ({ ...prev, [tipo]: path }));
    } catch (err: any) {
      alert('Error al subir: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  const eliminarDocumentoEmpresa = async (tipo: string) => {
    const path = docsEmpresa[tipo];
    if (!path) return;
    if (!confirm('¿Eliminar este archivo?')) return;
    setCargando(true);
    await supabase.storage.from('documentos_despacho').remove([path]);
    await supabase.from('documentos_empresa').update({ path: null }).eq('tipo', tipo);
    setDocsEmpresa(prev => ({ ...prev, [tipo]: null }));
    setCargando(false);
  };

  const guardarEdicionUnidad = async () => {
    if (!editingU || !editingU.marca_modelo.trim() || !editingU.placas.trim()) return;
    setCargando(true);
    await supabase.from('unidades_fisicas').update({
      marca_modelo: editingU.marca_modelo.trim(),
      placas: editingU.placas.trim().toUpperCase(),
      color: editingU.color?.trim() || null,
      poliza_path: editingU.poliza_path || null,
      fumigacion_path: editingU.fumigacion_path || null,
    }).eq('id', editingU.id);
    setCargando(false);
    setEditingU(null);
    await onRefresh();
  };

  const guardarEdicionPersonal = async () => {
    if (!editingP || !editingP.nombre_completo.trim()) return;
    setCargando(true);
    await supabase.from('personal').update({
      nombre_completo: editingP.nombre_completo.trim(),
      apodo: editingP.apodo?.trim() || null,
      rol: editingP.rol,
      telefono: editingP.telefono?.trim() || null,
      ine_path: editingP.ine_path || null,
      licencia_path: editingP.licencia_path || null,
    }).eq('id', editingP.id);
    setCargando(false);
    setEditingP(null);
    await onRefresh();
  };

  const agregarUnidad = async () => {
    if (!nuevaUnidad.marca_modelo.trim() || !nuevaUnidad.placas.trim()) return;
    setCargando(true);
    await supabase.from('unidades_fisicas').insert([{ ...nuevaUnidad, activo: true }]);
    setCargando(false);
    setNuevaUnidad({ marca_modelo: '', placas: '', color: '' });
    await onRefresh();
  };

  const agregarPersonal = async () => {
    if (!nuevoPersonal.nombre_completo.trim()) return;
    setCargando(true);
    await supabase.from('personal').insert([{ ...nuevoPersonal, activo: true }]);
    setCargando(false);
    setNuevoPersonal({ nombre_completo: '', apodo: '', rol: 'chofer', telefono: '' });
    await onRefresh();
  };

  const toggleActivoUnidad = async (u: UnidadFisica) => {
    const { error } = await supabase.from('unidades_fisicas').update({ activo: !u.activo }).eq('id', u.id);
    if (!error) await onRefresh();
  };

  const toggleActivoPersonal = async (p: Personal) => {
    const { error } = await supabase.from('personal').update({ activo: !p.activo }).eq('id', p.id);
    if (!error) await onRefresh();
  };

  const f = filtro.toLowerCase();
  const unidadesFiltradas = unidades.filter(u => !f || u.marca_modelo.toLowerCase().includes(f)).sort((a, b) => (a.activo === b.activo ? a.marca_modelo.localeCompare(b.marca_modelo) : a.activo ? -1 : 1));
  const personalFiltrado = personal.filter(p => !f || p.nombre_completo.toLowerCase().includes(f)).sort((a, b) => (a.activo === b.activo ? a.nombre_completo.localeCompare(b.nombre_completo) : a.activo ? -1 : 1));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '640px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Gestión de Recursos</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '26px', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
          <button onClick={() => { setTab('unidades'); setEditingP(null); }} style={{ flex: 1, padding: '12px', background: 'none', border: 'none', borderBottom: tab === 'unidades' ? '2px solid #007AFF' : 'none', fontWeight: 600, color: tab === 'unidades' ? '#007AFF' : '#666' }}>Unidades</button>
          <button onClick={() => { setTab('personal'); setEditingU(null); }} style={{ flex: 1, padding: '12px', background: 'none', border: 'none', borderBottom: tab === 'personal' ? '2px solid #007AFF' : 'none', fontWeight: 600, color: tab === 'personal' ? '#007AFF' : '#666' }}>Personal</button>
          <button onClick={() => { setTab('empresa'); setEditingU(null); setEditingP(null); }} style={{ flex: 1, padding: '12px', background: 'none', border: 'none', borderBottom: tab === 'empresa' ? '2px solid #007AFF' : 'none', fontWeight: 600, color: tab === 'empresa' ? '#007AFF' : '#666' }}>Empresa</button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          
          {tab === 'unidades' && (
            <>
              <div style={{ padding: '12px', background: '#F2F2F7', borderRadius: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gap: '8px' }}>
                  <AppleInput placeholder="Marca / Modelo" value={nuevaUnidad.marca_modelo} onChange={(e) => setNuevaUnidad({ ...nuevaUnidad, marca_modelo: e.target.value })} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <AppleInput placeholder="Placas" value={nuevaUnidad.placas} onChange={(e) => setNuevaUnidad({ ...nuevaUnidad, placas: e.target.value })} />
                    <AppleInput placeholder="Color" value={nuevaUnidad.color} onChange={(e) => setNuevaUnidad({ ...nuevaUnidad, color: e.target.value })} />
                  </div>
                  <button className="btn-apple" onClick={agregarUnidad} disabled={cargando} style={{ background: '#007AFF', color: '#fff' }}>Agregar Unidad</button>
                </div>
              </div>
              <AppleInput placeholder="🔍 Buscar unidad..." value={filtro} onChange={(e) => setFiltro(e.target.value)} />
              <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
                {unidadesFiltradas.map(u => (
                  <div key={u.id} style={{ padding: '12px', borderRadius: '10px', background: u.activo ? '#fff' : '#F9F9F9', border: '1px solid #eee' }}>
                    {editingU?.id === u.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <AppleInput value={editingU.marca_modelo} onChange={(e) => setEditingU({ ...editingU, marca_modelo: e.target.value })} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <AppleInput value={editingU.placas} onChange={(e) => setEditingU({ ...editingU, placas: e.target.value })} />
                          <AppleInput value={editingU.color || ''} onChange={(e) => setEditingU({ ...editingU, color: e.target.value })} />
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px', padding: '12px', background: '#F2F2F7', borderRadius: '8px' }}>
                          <div>
                            <p style={{ fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Póliza Seguro</p>
                            {editingU.poliza_path ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '11px', color: '#34C759', fontWeight: 600 }}>✅ Subida</span>
                                <button onClick={() => eliminarDocumentoUnidad('poliza')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                              </div>
                            ) : (
                              <input type="file" accept="image/*,.pdf" onChange={(e) => { if(e.target.files?.[0]) subirDocumentoUnidad(e.target.files[0], 'poliza') }} style={{ fontSize: '10px', width: '100%' }} />
                            )}
                          </div>
                          <div>
                            <p style={{ fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Cert. Fumigación</p>
                            {editingU.fumigacion_path ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '11px', color: '#34C759', fontWeight: 600 }}>✅ Subida</span>
                                <button onClick={() => eliminarDocumentoUnidad('fumigacion')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                              </div>
                            ) : (
                              <input type="file" accept="image/*,.pdf" onChange={(e) => { if(e.target.files?.[0]) subirDocumentoUnidad(e.target.files[0], 'fumigacion') }} style={{ fontSize: '10px', width: '100%' }} />
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <button onClick={() => setEditingU(null)} className="btn-apple btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                          <button onClick={guardarEdicionUnidad} className="btn-apple" style={{ flex: 1, background: '#34C759', color: '#fff' }}>Guardar</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '14px' }}>{u.marca_modelo}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>{u.placas} · Póliza: {u.poliza_path ? '✅' : '❌'} · Fumigación: {u.fumigacion_path ? '✅' : '❌'}</div>
                        </div>
                        <button onClick={() => setEditingU(u)} style={{ background: 'none', border: 'none', fontSize: '16px' }}>✏️</button>
                        <button onClick={() => toggleActivoUnidad(u)} style={{ padding: '6px 12px', borderRadius: '16px', fontSize: '11px', border: 'none', background: u.activo ? '#34C759' : '#E5E5EA', color: u.activo ? '#fff' : '#666' }}>{u.activo ? 'ACTIVA' : 'INACTIVA'}</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'personal' && (
            <>
              <div style={{ padding: '12px', background: '#F2F2F7', borderRadius: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gap: '8px' }}>
                  <AppleInput placeholder="Nombre completo" value={nuevoPersonal.nombre_completo} onChange={(e) => setNuevoPersonal({ ...nuevoPersonal, nombre_completo: e.target.value })} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <AppleInput placeholder="Apodo" value={nuevoPersonal.apodo} onChange={(e) => setNuevoPersonal({ ...nuevoPersonal, apodo: e.target.value })} />
                    <AppleInput placeholder="Teléfono" value={nuevoPersonal.telefono} onChange={(e) => setNuevoPersonal({ ...nuevoPersonal, telefono: e.target.value })} />
                  </div>
                  <button className="btn-apple" onClick={agregarPersonal} disabled={cargando} style={{ background: '#007AFF', color: '#fff' }}>Agregar Personal</button>
                </div>
              </div>
              <AppleInput placeholder="🔍 Buscar persona..." value={filtro} onChange={(e) => setFiltro(e.target.value)} />
              <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
                {personalFiltrado.map(p => (
                  <div key={p.id} style={{ padding: '12px', borderRadius: '10px', background: p.activo ? '#fff' : '#F9F9F9', border: '1px solid #eee' }}>
                    {editingP?.id === p.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <AppleInput value={editingP.nombre_completo} onChange={(e) => setEditingP({ ...editingP, nombre_completo: e.target.value })} />
                        <select className="input-apple" value={editingP.rol} onChange={(e) => setEditingP({ ...editingP, rol: e.target.value })}>
                          <option value="chofer">Chofer</option>
                          <option value="ambos">Chofer / Auxiliar</option>
                          <option value="cargador">Cargador</option>
                          <option value="ayudante">Ayudante</option>
                        </select>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px', padding: '12px', background: '#F2F2F7', borderRadius: '8px' }}>
                          <div>
                            <p style={{ fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>INE</p>
                            {editingP.ine_path ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '11px', color: '#34C759', fontWeight: 600 }}>✅ Subida</span>
                                <button onClick={() => eliminarDocumentoPersonal('ine')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                              </div>
                            ) : (
                              <input type="file" accept="image/*,.pdf" onChange={(e) => { if(e.target.files?.[0]) subirDocumentoPersonal(e.target.files[0], 'ine') }} style={{ fontSize: '10px', width: '100%' }} />
                            )}
                          </div>
                          <div>
                            <p style={{ fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Licencia</p>
                            {editingP.licencia_path ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '11px', color: '#34C759', fontWeight: 600 }}>✅ Subida</span>
                                <button onClick={() => eliminarDocumentoPersonal('licencia')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                              </div>
                            ) : (
                              <input type="file" accept="image/*,.pdf" onChange={(e) => { if(e.target.files?.[0]) subirDocumentoPersonal(e.target.files[0], 'licencia') }} style={{ fontSize: '10px', width: '100%' }} />
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <button onClick={() => setEditingP(null)} className="btn-apple btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                          <button onClick={guardarEdicionPersonal} disabled={cargando} className="btn-apple" style={{ flex: 1, background: '#34C759', color: '#fff' }}>Guardar</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '14px' }}>{p.nombre_completo}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>{p.rol} · INE: {p.ine_path ? '✅' : '❌'} · Lic: {p.licencia_path ? '✅' : '❌'}</div>
                        </div>
                        <button onClick={() => setEditingP(p)} style={{ background: 'none', border: 'none', fontSize: '16px' }}>✏️</button>
                        <button onClick={() => toggleActivoPersonal(p)} style={{ padding: '6px 12px', borderRadius: '16px', fontSize: '11px', border: 'none', background: p.activo ? '#34C759' : '#E5E5EA', color: p.activo ? '#fff' : '#666' }}>{p.activo ? 'ACTIVO' : 'INACTIVO'}</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'empresa' && (
            <div style={{ padding: '10px 0' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', textAlign: 'center' }}>Documentos de la Empresa</h3>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '24px', textAlign: 'center' }}>Gestiona los archivos mensuales para enviarlos en el despacho.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {DOCS_EMPRESA.map(doc => {
                  const currentPath = docsEmpresa[doc.id];
                  return (
                    <div key={doc.id} style={{ background: '#F2F2F7', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
                      <p style={{ fontWeight: 600, fontSize: '15px', marginBottom: '12px' }}>{doc.label}</p>
                      
                      {currentPath ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '12px', borderRadius: '8px' }}>
                          <span style={{ color: '#34C759', fontWeight: 600, fontSize: '13px' }}>✅ Archivo cargado</span>
                          <button onClick={() => eliminarDocumentoEmpresa(doc.id)} disabled={cargando} style={{ background: 'none', color: 'red', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Eliminar</button>
                        </div>
                      ) : (
                        <div style={{ width: '100%' }}>
                          <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>No hay archivo.</p>
                          <input 
                            type="file" 
                            accept=".pdf,.xlsx,.xls,image/*" 
                            onChange={(e) => { if(e.target.files?.[0]) subirDocumentoEmpresa(e.target.files[0], doc.id) }} 
                            style={{ padding: '8px', background: '#fff', borderRadius: '8px', border: '1px solid #ccc', width: '100%' }} 
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}