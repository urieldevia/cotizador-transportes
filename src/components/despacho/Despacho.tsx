import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../lib/supabase';
import { AppleCard } from '../ui/AppleCard';
import { GestionRecursos } from '../volante/GestionRecursos';
import type { Personal, UnidadFisica } from '../../types';

const formatearNombre = (nombre: string | undefined) => {
  if (!nombre) return '';
  return nombre.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

export function Despacho() {
  const { despacho, addAsignacion, updateAsignacion, removeAsignacion } = useAppStore();
  
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [unidadesFisicas, setUnidadesFisicas] = useState<UnidadFisica[]>([]);
  const [docsEmpresa, setDocsEmpresa] = useState<Record<string, string | null>>({});
  const [mostrarGestion, setMostrarGestion] = useState(false);
  
  const [previewData, setPreviewData] = useState<{ mensajeBase: string, archivosDisponibles: any[] } | null>(null);
  const [archivosParaEnviar, setArchivosParaEnviar] = useState<string[]>([]);
  const [subiendo, setSubiendo] = useState(false);

  const recargarDatos = useCallback(async () => {
    const { data: opData } = await supabase.from('personal').select('*').eq('activo', true);
    if (opData) setPersonal(opData as Personal[]);
    
    const { data: unData } = await supabase.from('unidades_fisicas').select('*').eq('activo', true);
    if (unData) setUnidadesFisicas(unData as UnidadFisica[]);

    const { data: docsData } = await supabase.from('documentos_empresa').select('tipo, path');
    if (docsData) {
      const paths: Record<string, string | null> = {};
      docsData.forEach(d => { paths[d.tipo] = d.path; });
      setDocsEmpresa(paths);
    }
  }, []);

  useEffect(() => {
    recargarDatos();
  }, [recargarDatos]);

  const handleTogglePersonal = (asignacionId: string, personaId: number, campo: 'operadores_ids' | 'auxiliares_ids') => {
    const asignacion = despacho.asignaciones.find(a => a.id === asignacionId);
    if (!asignacion) return;
    const actuales = asignacion[campo] || [];
    const nuevos = actuales.includes(personaId) ? actuales.filter(id => id !== personaId) : [...actuales, personaId];
    updateAsignacion(asignacionId, { [campo]: nuevos } as any);
  };

  const limpiarAsignacion = (id: string) => {
    updateAsignacion(id, { unidad_fisica_id: null, operadores_ids: [], auxiliares_ids: [] });
  };

  const prepararMensajeGlobal = () => {
    let mensajeBase = `🚛 *TRANSPORTES RAMÍREZ*\n`;
    mensajeBase += `_Departamento de Logística_\n\n`;
    mensajeBase += `📋 *ASIGNACIÓN DE SERVICIO*\n\n`;

    let idsPersonalInvolucrado: number[] = [];
    const archivosDisponibles: any[] = [];

    despacho.asignaciones.forEach((asig, index) => {
      const un = unidadesFisicas.find(u => u.id === asig.unidad_fisica_id);
      const ops = asig.operadores_ids.map(id => formatearNombre(personal.find(p => p.id === id)?.nombre_completo)).filter(Boolean);
      const auxs = (asig.auxiliares_ids || []).map(id => formatearNombre(personal.find(p => p.id === id)?.nombre_completo)).filter(Boolean);

      if (un) {
        if (un.poliza_path) archivosDisponibles.push({ label: `Póliza Seguro - ${un.marca_modelo} (${un.placas})`, path: un.poliza_path });
        if (un.fumigacion_path) archivosDisponibles.push({ label: `Cert. Fumigación - ${un.marca_modelo} (${un.placas})`, path: un.fumigacion_path });
      }

      idsPersonalInvolucrado = [...idsPersonalInvolucrado, ...asig.operadores_ids, ...(asig.auxiliares_ids || [])];

      let marca = 'N/A';
      let modelo = 'N/A';
      if (un?.marca_modelo) {
        const partes = un.marca_modelo.split(' ');
        marca = partes[0];
        if (partes.length > 1) modelo = partes.slice(1).join(' ');
      }

      const color = un?.color || 'N/A';
      const placas = un?.placas || 'N/A';

      if (despacho.asignaciones.length > 1) mensajeBase += `*[Unidad ${index + 1}]*\n`;
      mensajeBase += `🚚 *Unidad:* *Marca:* ${marca} · *Modelo:* ${modelo} · *Color:* ${color} · *Placas:* ${placas}\n`;
      mensajeBase += `👨‍✈️ *Operador:* ${ops.length > 0 ? ops.join(' / ') : 'Por definir'}\n`;
      
      if (auxs.length > 0) {
        mensajeBase += `🧑‍🔧 *Auxiliares:*\n`;
        auxs.forEach(aux => { mensajeBase += `- ${aux}\n`; });
      } else {
        mensajeBase += `🧑‍🔧 *Auxiliares:*\n- Ninguno\n`;
      }

      if (index < despacho.asignaciones.length - 1) mensajeBase += `\n`;
    });

    const idsUnicos = Array.from(new Set(idsPersonalInvolucrado));
    idsUnicos.forEach(id => {
      const p = personal.find(p => p.id === id);
      if (p) {
        if (p.ine_path) archivosDisponibles.push({ label: `INE - ${formatearNombre(p.nombre_completo)}`, path: p.ine_path });
        if (p.licencia_path) archivosDisponibles.push({ label: `Licencia - ${formatearNombre(p.nombre_completo)}`, path: p.licencia_path });
      }
    });

    if (docsEmpresa['sua']) archivosDisponibles.push({ label: 'SUA (Mensual)', path: docsEmpresa['sua'] });
    if (docsEmpresa['linea_captura']) archivosDisponibles.push({ label: 'Línea de Captura', path: docsEmpresa['linea_captura'] });
    if (docsEmpresa['comprobante_pago']) archivosDisponibles.push({ label: 'Comprobante de Pago', path: docsEmpresa['comprobante_pago'] });

    setPreviewData({ mensajeBase, archivosDisponibles });
    setArchivosParaEnviar([]);
  };

  const enviarWhatsApp = async () => {
    if (!previewData) return;
    setSubiendo(true);

    let mensajeFinal = previewData.mensajeBase;
    const enlacesSubidos: string[] = [];

    if (archivosParaEnviar.length > 0) {
      for (const path of archivosParaEnviar) {
        const { data } = await supabase.storage.from('documentos_despacho').createSignedUrl(path, 604800);
        if (data) {
          const archivoInfo = previewData.archivosDisponibles.find(a => a.path === path);
          enlacesSubidos.push(`📄 *${archivoInfo?.label}:*\n${data.signedUrl}`);
        }
      }

      if (enlacesSubidos.length > 0) {
        mensajeFinal += `\n\n🔗 *Documentos adjuntos:*\n`;
        mensajeFinal += enlacesSubidos.join('\n\n');
      }
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(mensajeFinal)}`, '_blank');
    setPreviewData(null);
    setArchivosParaEnviar([]);
    setSubiendo(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '100px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>Base de datos</h2>
        <button 
          onClick={() => setMostrarGestion(true)}
          style={{ padding: '10px 16px', background: '#E5E5EA', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#007AFF', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          ⚙️ Abrir Gestión
        </button>
      </div>

      {despacho.asignaciones.map((asig, index) => (
        <AppleCard key={asig.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Asignación {index + 1}</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => limpiarAsignacion(asig.id)} style={{ color: '#FF9500', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>Limpiar</button>
              {despacho.asignaciones.length > 1 && (
                <button onClick={() => removeAsignacion(asig.id)} style={{ color: 'var(--sys-red)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>Eliminar</button>
              )}
            </div>
          </div>

          <p style={{ fontSize: '12px', fontWeight: 600, color: 'gray', marginBottom: '4px' }}>Unidad Física</p>
          <select className="input-apple" value={asig.unidad_fisica_id ?? ''} onChange={(e) => updateAsignacion(asig.id, { unidad_fisica_id: Number(e.target.value) || null })}>
            <option value="">Seleccionar unidad...</option>
            {unidadesFisicas.map(uf => <option key={uf.id} value={uf.id}>{uf.marca_modelo} - {uf.placas}</option>)}
          </select>

          <p style={{ fontSize: '12px', fontWeight: 600, color: 'gray', marginTop: '16px', marginBottom: '4px' }}>Operadores</p>
          <div className="chip-container">
            {personal.filter(p => p.rol === 'chofer' || p.rol === 'ambos').map(op => (
              <button key={op.id} className={`chip ${asig.operadores_ids.includes(op.id) ? 'active' : ''}`} onClick={() => handleTogglePersonal(asig.id, op.id, 'operadores_ids')}>
                {formatearNombre(op.nombre_completo)}
              </button>
            ))}
          </div>

          <p style={{ fontSize: '12px', fontWeight: 600, color: 'gray', marginTop: '16px', marginBottom: '4px' }}>Auxiliares</p>
          <div className="chip-container">
            {personal.filter(p => !asig.operadores_ids.includes(p.id)).map(aux => (
              <button key={aux.id} className={`chip ${asig.auxiliares_ids?.includes(aux.id) ? 'active' : ''}`} onClick={() => handleTogglePersonal(asig.id, aux.id, 'auxiliares_ids')}>
                {formatearNombre(aux.nombre_completo)}
              </button>
            ))}
          </div>
        </AppleCard>
      ))}

      <button className="btn-apple btn-secondary" style={{ width: '100%' }} onClick={addAsignacion}>+ Añadir otra asignación</button>

      <div className="btn-floating" onClick={prepararMensajeGlobal} style={{ background: 'rgba(37, 211, 102, 0.95)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '12px', opacity: 0.9, fontWeight: 500 }}>COMPARTIR</div>
          <div style={{ fontSize: '20px', fontWeight: 800 }}>Previsualizar y Enviar Todo</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.2)', padding: '8px 16px', borderRadius: '12px' }}>
          <span style={{ fontSize: '20px' }}>📲</span>
        </div>
      </div>

      {previewData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ background: '#075E54', padding: '16px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Vista Previa</h3>
                <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>Selecciona los documentos a enviar</p>
              </div>
              <button onClick={() => setPreviewData(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            
            <div style={{ padding: '20px', background: '#ECE5DD', overflowY: 'auto' }}>
              <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', borderTopLeftRadius: 0, fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-wrap', color: '#000', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', fontFamily: 'sans-serif', marginBottom: '16px' }}>
                {previewData.mensajeBase}
              </div>

              {previewData.archivosDisponibles.length > 0 && (
                <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', fontSize: '13px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                  <p style={{ fontWeight: 700, marginBottom: '8px', color: '#075E54' }}>📎 Documentos disponibles:</p>
                  {previewData.archivosDisponibles.map((archivo, idx) => (
                    <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={archivosParaEnviar.includes(archivo.path)}
                        onChange={(e) => {
                          if (e.target.checked) setArchivosParaEnviar([...archivosParaEnviar, archivo.path]);
                          else setArchivosParaEnviar(archivosParaEnviar.filter(p => p !== archivo.path));
                        }}
                        style={{ width: '16px', height: '16px' }}
                      />
                      <span>{archivo.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '16px', display: 'flex', gap: '8px', background: '#F9F9F9', borderTop: '1px solid #eee' }}>
              <button className="btn-apple btn-secondary" style={{ flex: 1 }} onClick={() => setPreviewData(null)}>Cancelar</button>
              <button 
                className="btn-apple" 
                style={{ flex: 2, background: subiendo ? '#999' : '#25D366', color: '#fff', border: 'none', fontWeight: 600 }} 
                onClick={enviarWhatsApp}
                disabled={subiendo}
              >
                {subiendo ? 'Procesando...' : 'Compartir en WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarGestion && (
        <GestionRecursos
          onClose={() => setMostrarGestion(false)}
          onRefresh={recargarDatos}
          personal={personal}
          unidades={unidadesFisicas}
        />
      )}

    </div>
  );
}