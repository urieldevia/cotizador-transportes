import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../lib/supabase';
import { AppleCard } from '../ui/AppleCard';
import { AppleInput } from '../ui/AppleInput';
import { IOSToggle } from '../ui/IOSToggle';
import { SearchUbicacion } from './SearchUbicacion';
import type { TipoOperacion } from '../../types';

const OPERACIONES: { id: TipoOperacion; label: string; icon: string }[] = [
  { id: 'flete', label: 'Flete', icon: '🚚' },
  { id: 'recoleccion', label: 'Recolección', icon: '📦' },
  { id: 'ruta', label: 'Ruta', icon: '🗺️' },
];

const unirTextos = (arr: string[]) => {
  if (arr.length === 0) return '';
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} y ${arr[1]}`;
  return `${arr.slice(0, -1).join(', ')} y ${arr[arr.length - 1]}`;
};

export function MotorCotizador() {
  const { 
    cotizador, setTipoOperacion, toggleExcepcion, setMontoCancelacion, setUnidad,
    setUnidadRampa, addOrigen, addDestino, removeOrigen, removeDestino, 
    updateOrigenPorcentaje, updateDestinoPorcentaje, updateExtras, toggleIncluirOrigenes,
    nuevoVolante, addParada, setCliente
  } = useAppStore();

  const [unidadesDB, setUnidadesDB] = useState<{ id: number, nombre: string }[]>([]);
  const [totalCalculado, setTotalCalculado] = useState(0);
  const [desgloseCostos, setDesgloseCostos] = useState<{nombre: string, monto: number}[]>([]);
  const [previewWA, setPreviewWA] = useState<string | null>(null);

  useEffect(() => {
    const fetchUnidades = async () => {
      const { data } = await supabase.from('unidades').select('id, nombre').eq('activo', true).order('orden_display');
      if (data) setUnidadesDB(data);
    };
    fetchUnidades();
  }, []);

  useEffect(() => {
    setUnidadRampa(true);
  }, [setUnidadRampa]);

  useEffect(() => {
    const calcularTotal = async () => {
      if (!cotizador.unidad.tipo_id) {
        setTotalCalculado(0);
        setDesgloseCostos([]);
        return;
      }

      let subtotal = 0;
      let desgloseTemp: {nombre: string, monto: number}[] = [];

      if (cotizador.incluir_origenes) {
        for (const o of cotizador.origenes) {
          const { data } = await supabase.from('tarifas').select('costo').eq('destino_id', o.ubicacion_id).eq('unidad_id', cotizador.unidad.tipo_id).single();
          if (data) {
            const monto = data.costo * (o.porcentaje_ajuste / 100);
            subtotal += monto;
            desgloseTemp.push({ nombre: `Origen: ${o.nombre_ubicacion} (${o.porcentaje_ajuste}%)`, monto });
          }
        }
      }

      for (const d of cotizador.destinos) {
        const { data } = await supabase.from('tarifas').select('costo').eq('destino_id', d.ubicacion_id).eq('unidad_id', cotizador.unidad.tipo_id).single();
        if (data) {
          const monto = data.costo * (d.porcentaje_ajuste / 100);
          subtotal += monto;
          desgloseTemp.push({ nombre: `Destino: ${d.nombre_ubicacion} (${d.porcentaje_ajuste}%)`, monto });
        }
      }

      if (cotizador.extras.tipo_maniobra !== 'ninguna') {
        subtotal += cotizador.extras.monto_maniobras;
        let nombreManiobra = 'Maniobras';
        if (cotizador.extras.tipo_maniobra === 'carga') nombreManiobra = 'Maniobras de carga';
        if (cotizador.extras.tipo_maniobra === 'descarga') nombreManiobra = 'Maniobras de descarga';
        if (cotizador.extras.tipo_maniobra === 'ambas') nombreManiobra = 'Maniobras de carga y descarga';
        desgloseTemp.push({ nombre: nombreManiobra, monto: cotizador.extras.monto_maniobras });
      }

      if (cotizador.extras.incluye_estadia) {
        const monto = cotizador.extras.dias_estadia * cotizador.extras.costo_por_dia;
        subtotal += monto;
        desgloseTemp.push({ nombre: `Estadía (${cotizador.extras.dias_estadia} días x $${cotizador.extras.costo_por_dia})`, monto });
      }

      // SUMAR EL AJUSTE MANUAL
      let totalConAjuste = subtotal;
      if (cotizador.extras.monto_ajuste > 0) {
        totalConAjuste += cotizador.extras.monto_ajuste;
        desgloseTemp.push({ nombre: 'Ajuste operativo', monto: cotizador.extras.monto_ajuste });
      }

      // APLICAR REDONDEO
      let totalFinal = totalConAjuste;
      if (cotizador.extras.redondear_a > 0) {
        totalFinal = Math.ceil(totalConAjuste / cotizador.extras.redondear_a) * cotizador.extras.redondear_a;
        const difRedondeo = totalFinal - totalConAjuste;
        if (difRedondeo > 0) {
          desgloseTemp.push({ nombre: `Redondeo a $${cotizador.extras.redondear_a}`, monto: difRedondeo });
        }
      }

      setTotalCalculado(totalFinal);
      setDesgloseCostos(desgloseTemp);
    };

    calcularTotal();
  }, [cotizador.unidad.tipo_id, cotizador.origenes, cotizador.destinos, cotizador.extras, cotizador.incluir_origenes]);

  const handleAddUbicacion = (tipo: 'origen' | 'destino', ubi: { id: number, poblacion: string, estado: string | null }) => {
    const nueva = {
      id: `${tipo}-${Date.now()}`,
      ubicacion_id: ubi.id,
      nombre_ubicacion: ubi.estado ? `${ubi.poblacion}, ${ubi.estado}` : ubi.poblacion,
      porcentaje_ajuste: 100
    };
    tipo === 'origen' ? addOrigen(nueva) : addDestino(nueva);
  };

  const generarMensajeWA = () => {
    let unidadNombre = cotizador.unidad.nombre || '';
    unidadNombre = unidadNombre.replace(/\bton\b/gi, 'tonelada');

    const origenes = cotizador.incluir_origenes ? cotizador.origenes.map(o => o.nombre_ubicacion) : [];
    const destinos = cotizador.destinos.map(d => d.nombre_ubicacion);
    
    const numO = origenes.length;
    const numD = destinos.length;
    const OStr = unirTextos(origenes);
    const DStr = unirTextos(destinos);
    
    let parrafo = '';
    const tipo = cotizador.tipo_operacion;

    if (tipo === 'flete') {
      if (numO === 1 && numD === 1) {
        parrafo = `Servicio de flete de ${OStr} a ${DStr}, en unidad de ${unidadNombre} con rampa hidráulica.`;
      } else if (numO > 1 && numD === 1) {
        parrafo = `Servicio de flete con recolección en ${OStr}, con entrega en ${DStr}, en unidad de ${unidadNombre} con rampa hidráulica.`;
      } else if (numO === 1 && numD > 1) {
        parrafo = `Servicio de flete con salida de ${OStr} y entregas en ${DStr}, en unidad de ${unidadNombre} con rampa hidráulica.`;
      } else if (numO > 1 && numD > 1) {
        parrafo = `Servicio de flete con recolección en ${OStr}, y entregas en ${DStr}, en unidad de ${unidadNombre} con rampa hidráulica.`;
      } else if (numO === 0 && numD > 0) {
        parrafo = `Servicio de flete con entrega en ${DStr}, en unidad de ${unidadNombre} con rampa hidráulica.`;
      } else if (numO > 0 && numD === 0) {
        parrafo = `Servicio de flete con recolección en ${OStr}, en unidad de ${unidadNombre} con rampa hidráulica.`;
      }
    } else if (tipo === 'recoleccion') {
      if (numD === 1) {
         parrafo = `Servicio de recolección en ${OStr || '[Origen]'} con destino a ${DStr}, en unidad de ${unidadNombre} con rampa hidráulica.`;
      } else if (numD > 1) {
         parrafo = `Servicio de recolección en ${OStr || '[Origen]'} con destinos a ${DStr}, en unidad de ${unidadNombre} con rampa hidráulica.`;
      } else if (numO > 0) {
         parrafo = `Servicio de recolección en ${OStr}, en unidad de ${unidadNombre} con rampa hidráulica.`;
      }
    } else if (tipo === 'ruta') {
      if (numO > 1 && numD > 1) {
        parrafo = `Servicio de ruta con recolección en ${OStr}, y entregas en ${DStr}, en unidad de ${unidadNombre} con rampa hidráulica.`;
      } else if (numO > 1 && numD === 1) {
        parrafo = `Servicio de ruta con recolecciones en ${OStr}, con entrega final en ${DStr}, en unidad de ${unidadNombre} con rampa hidráulica.`;
      } else if (numO === 1 && numD > 1) {
        parrafo = `Servicio de ruta con carga en ${OStr} y entregas en ${DStr}, en unidad de ${unidadNombre} con rampa hidráulica.`;
      } else if (numO === 1 && numD === 1) {
        parrafo = `Servicio de ruta de ${OStr} a ${DStr}, en unidad de ${unidadNombre} con rampa hidráulica.`;
      } else {
        parrafo = `Servicio de ruta en unidad de ${unidadNombre} con rampa hidráulica.`;
      }
    }

    if (!parrafo) {
      parrafo = `Servicio de transporte en unidad de ${unidadNombre} con rampa hidráulica.`;
    }

    if (cotizador.extras.tipo_maniobra === 'carga') {
      parrafo += ` Incluye maniobras de carga.`;
    } else if (cotizador.extras.tipo_maniobra === 'descarga') {
      parrafo += ` Incluye maniobras de descarga.`;
    } else if (cotizador.extras.tipo_maniobra === 'ambas') {
      parrafo += ` Incluye maniobras de carga y descarga.`;
    }

    if (cotizador.extras.incluye_estadia) {
      parrafo += ` Incluye estadía de ${cotizador.extras.dias_estadia} ${cotizador.extras.dias_estadia === 1 ? 'día' : 'días'} con un costo de $${cotizador.extras.costo_por_dia.toLocaleString('es-MX')} por día.`;
    }

    parrafo += ` Total: $${totalCalculado.toLocaleString('es-MX')} MXN más IVA.`;
    
    const textoFinal = `🚛 *TRANSPORTES RAMÍREZ*\n_Cotización de Servicio_\n\n${parrafo}\n\n_Quedamos a sus órdenes._`;
    
    setPreviewWA(textoFinal);
  };

  const enviarAVolante = () => {
    nuevoVolante();
    setCliente(`Cotización: ${cotizador.tipo_operacion.toUpperCase()}`);
    
    if (cotizador.incluir_origenes) {
      cotizador.origenes.forEach((o, index) => {
        addParada({
          id_parada: `carga-cot-${Date.now()}-${index}`,
          tipo: 'carga',
          cliente_referencia: o.nombre_ubicacion,
          folio_fisico_cliente: '',
          folio_vinculado: '',
          ubicacion: o.nombre_ubicacion,
          hora: '08:00',
          hora_indefinida: true,
          detalle: `Unidad: ${cotizador.unidad.nombre} (Rampa)`
        });
      });
    }

    cotizador.destinos.forEach((d, index) => {
      addParada({
        id_parada: `desc-cot-${Date.now()}-${index}`,
        tipo: 'descarga',
        cliente_referencia: d.nombre_ubicacion,
        folio_fisico_cliente: '',
        folio_vinculado: '',
        ubicacion: d.nombre_ubicacion,
        hora: '14:00',
        hora_indefinida: true,
        detalle: `Unidad: ${cotizador.unidad.nombre} (Rampa)`
      });
    });

    alert('✅ Datos enviados al Volante. Ve a la pestaña "Volante" para completar la asignación.');
  };

  return (
    <div className="cotizador-wrapper">
      
      {!cotizador.excepcion_cancelacion && (
        <AppleCard>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>1. Configuración de Unidad</h3>
          <select 
            className="input-apple" 
            value={cotizador.unidad.tipo_id || ''}
            onChange={(e) => {
              const selectedId = Number(e.target.value);
              const selectedName = unidadesDB.find(u => u.id === selectedId)?.nombre || '';
              setUnidad(selectedId, selectedName);
            }}
          >
            <option value="">Seleccionar tipo de unidad...</option>
            {unidadesDB.map(u => (
              <option key={u.id} value={u.id}>{u.nombre}</option>
            ))}
          </select>
        </AppleCard>
      )}

      {!cotizador.excepcion_cancelacion && (
        <AppleCard>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>2. Tipo de Operación</h3>
          <div className="operation-grid">
            {OPERACIONES.map(op => (
              <button 
                key={op.id}
                className={`operation-btn ${cotizador.tipo_operacion === op.id ? 'active' : ''}`}
                onClick={() => setTipoOperacion(op.id)}
              >
                <span style={{ fontSize: '24px', marginBottom: '4px' }}>{op.icon}</span>
                {op.label}
              </button>
            ))}
          </div>
        </AppleCard>
      )}

      <AppleCard style={{ background: cotizador.excepcion_cancelacion ? 'rgba(255, 59, 48, 0.1)' : '' }}>
        <IOSToggle 
          label="⚠️ Falso Flete / Cancelación en Sitio" 
          checked={cotizador.excepcion_cancelacion} 
          onChange={toggleExcepcion} 
        />
        
        {cotizador.excepcion_cancelacion && (
          <div style={{ marginTop: '20px' }}>
            <AppleInput 
              label="Monto por cancelación ($)" 
              type="number" 
              placeholder="0.00"
              value={cotizador.monto_cancelacion || ''}
              onChange={(e) => setMontoCancelacion(Number(e.target.value))}
              style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center' }}
            />
          </div>
        )}
      </AppleCard>

      {!cotizador.excepcion_cancelacion && (
        <>
          <AppleCard>
            <IOSToggle label="¿Incluir Orígenes?" checked={cotizador.incluir_origenes} onChange={toggleIncluirOrigenes} />
            {cotizador.incluir_origenes && (
              <div style={{ marginTop: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Puntos de Origen</h3>
                {cotizador.origenes.map((o) => (
                  <div key={o.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '16px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 600 }}>{o.nombre_ubicacion}</span>
                      <button onClick={() => removeOrigen(o.id)} style={{ color: 'var(--sys-red)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Eliminar</button>
                    </div>
                    <AppleInput label="Porcentaje (%)" type="number" value={o.porcentaje_ajuste} onChange={(e) => updateOrigenPorcentaje(o.id, Number(e.target.value))} />
                  </div>
                ))}
                <SearchUbicacion onSelect={(u) => handleAddUbicacion('origen', u)} placeholder="Agregar origen..." />
              </div>
            )}
          </AppleCard>

          <AppleCard>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>4. Destinos</h3>
            {cotizador.destinos.map((d) => (
              <div key={d.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600 }}>{d.nombre_ubicacion}</span>
                  <button onClick={() => removeDestino(d.id)} style={{ color: 'var(--sys-red)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Eliminar</button>
                </div>
                <AppleInput label="Porcentaje de ajuste (%)" type="number" value={d.porcentaje_ajuste} onChange={(e) => updateDestinoPorcentaje(d.id, Number(e.target.value))} />
              </div>
            ))}
            <div style={{ marginTop: '16px' }}>
              <SearchUbicacion onSelect={(u) => handleAddUbicacion('destino', u)} placeholder="Agregar nuevo destino..." />
            </div>
          </AppleCard>
        </>
      )}

      {!cotizador.excepcion_cancelacion && (
        <AppleCard>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>5. Extras</h3>
          
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'gray', marginBottom: '4px' }}>Tipo de Maniobras</p>
          <select 
            className="input-apple"
            value={cotizador.extras.tipo_maniobra || 'ninguna'}
            onChange={(e) => {
              const val = e.target.value as any;
              updateExtras({ 
                tipo_maniobra: val, 
                incluye_maniobras: val !== 'ninguna' 
              });
            }}
            style={{ marginBottom: '12px' }}
          >
            <option value="ninguna">Sin maniobras</option>
            <option value="carga">Maniobras de carga</option>
            <option value="descarga">Maniobras de descarga</option>
            <option value="ambas">Maniobras de carga y descarga</option>
          </select>

          {cotizador.extras.tipo_maniobra !== 'ninguna' && (
            <AppleInput 
              type="number" 
              placeholder="Monto total de maniobras" 
              value={cotizador.extras.monto_maniobras || ''} 
              onChange={(e) => updateExtras({ monto_maniobras: Number(e.target.value) })} 
              style={{ marginBottom: '16px' }} 
            />
          )}

          <IOSToggle label="Incluir Estadía" checked={cotizador.extras.incluye_estadia} onChange={(val) => updateExtras({ incluye_estadia: val })} />
          {cotizador.extras.incluye_estadia && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
              <AppleInput type="number" placeholder="Días" value={cotizador.extras.dias_estadia || ''} onChange={(e) => updateExtras({ dias_estadia: Number(e.target.value) })} />
              <AppleInput type="number" placeholder="Costo por día" value={cotizador.extras.costo_por_dia || ''} onChange={(e) => updateExtras({ costo_por_dia: Number(e.target.value) })} />
            </div>
          )}

          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Ajustes de Cotización</h4>
            
            <AppleInput 
              label="Monto Extra (Oculto al cliente)" 
              type="number" 
              placeholder="Ej. 500" 
              value={cotizador.extras.monto_ajuste || ''} 
              onChange={(e) => updateExtras({ monto_ajuste: Number(e.target.value) })} 
            />
            <p style={{ fontSize: '11px', color: '#666', marginTop: '4px', marginBottom: '16px' }}>
              * Este monto se suma al total, pero no se detalla en el mensaje.
            </p>

            <p style={{ fontSize: '12px', fontWeight: 600, color: 'gray', marginBottom: '6px' }}>Redondear Total (Hacia arriba)</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[0, 50, 100, 500].map(val => (
                <button
                  key={val}
                  onClick={() => updateExtras({ redondear_a: val })}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: cotizador.extras.redondear_a === val ? '2px solid #007AFF' : '1px solid #ccc',
                    background: cotizador.extras.redondear_a === val ? '#E6F0FF' : '#fff',
                    color: cotizador.extras.redondear_a === val ? '#007AFF' : '#333',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  {val === 0 ? 'Ninguno' : `$${val}`}
                </button>
              ))}
            </div>
          </div>
        </AppleCard>
      )}

      {totalCalculado > 0 && (
        <AppleCard>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Resumen de Costos</h3>
          <div className="receipt-preview" style={{ marginBottom: '20px' }}>
            {desgloseCostos.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>{item.nombre}</span>
                <span>${item.monto.toLocaleString('es-MX')}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px dashed #ccc', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '16px' }}>
              <span>TOTAL ESTIMADO</span>
              <span>${totalCalculado.toLocaleString('es-MX')}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button 
              className="btn-apple" 
              onClick={generarMensajeWA}
              style={{ background: '#25D366', color: '#fff', border: 'none', fontWeight: 600 }}
            >
              💬 WhatsApp
            </button>
            <button 
              className="btn-apple" 
              onClick={enviarAVolante}
              style={{ background: '#007AFF', color: '#fff', border: 'none', fontWeight: 600 }}
            >
              📤 Enviar a Volante
            </button>
          </div>
        </AppleCard>
      )}

      <div className="btn-floating">
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '12px', opacity: 0.8, fontWeight: 500 }}>TOTAL ESTIMADO</div>
          <div style={{ fontSize: '20px', fontWeight: 800 }}>
            ${totalCalculado > 0 ? totalCalculado.toLocaleString('es-MX') : '0'} + IVA
          </div>
        </div>
      </div>

      {previewWA && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '400px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden'
          }}>
            <div style={{ background: '#075E54', padding: '16px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Vista Previa de Cotización</h3>
              <button onClick={() => setPreviewWA(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            
            <div style={{ padding: '20px', background: '#ECE5DD', maxHeight: '50vh', overflowY: 'auto' }}>
              <div style={{
                background: '#fff', padding: '12px', borderRadius: '8px', borderTopLeftRadius: 0,
                fontSize: '14px', lineHeight: 1.5, whiteSpace: 'pre-wrap', color: '#000',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)', fontFamily: 'sans-serif'
              }}>
                {previewWA}
              </div>
            </div>

            <div style={{ padding: '16px', display: 'flex', gap: '8px', background: '#F9F9F9' }}>
              <button className="btn-apple btn-secondary" style={{ flex: 1 }} onClick={() => setPreviewWA(null)}>Cerrar</button>
              <button 
                className="btn-apple" 
                style={{ flex: 2, background: '#25D366', color: '#fff', border: 'none', fontWeight: 600 }}
                onClick={() => {
                  window.open(`https://wa.me/?text=${encodeURIComponent(previewWA)}`, '_blank');
                  setPreviewWA(null);
                }}
              >
                Enviar por WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}