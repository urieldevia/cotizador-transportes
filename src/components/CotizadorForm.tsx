import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { calcularCotizacion } from '../lib/cotizacionEngine';
import type { CotizacionResult, TipoModalidad, Maniobras, PuntoCotizacion, Unidad } from '../lib/types';
import { SelectorUbicacion } from './SelectorUbicacion';
import { DesgloseCotizacion } from './DesgloseCotizacion';

const IOSToggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="ios-toggle-row" onClick={() => onChange(!checked)}>
    <span className="ios-toggle-label">{label}</span>
    <div className={`ios-switch ${checked ? 'active' : ''}`}><div className="ios-switch-knob" /></div>
  </div>
);

const MODALIDADES: { id: TipoModalidad; label: string; icon: string }[] = [
  { id: 'flete_directo', label: 'Directo', icon: '🚚' },
  { id: 'con_escalas', label: 'Escalas', icon: '📍' },
  { id: 'ruta_fija', label: 'Ruta Fija', icon: '🗺️' },
  { id: 'regreso', label: 'Regreso', icon: '↩️' },
  { id: 'consolidado', label: 'Consolidado', icon: '📦' },
  { id: 'redondo', label: 'Redondo', icon: '🔄' },
  { id: 'local', label: 'Local', icon: '🏙️' },
];

export function CotizadorForm() {
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [unidadId, setUnidadId] = useState<number | null>(null);
  const [modalidad, setModalidad] = useState<TipoModalidad>('flete_directo');

  const [incluirPuntosCarga, setIncluirPuntosCarga] = useState(false);
  const [aplicaPorcentajeCarga, setAplicaPorcentajeCarga] = useState(false);
  const [aplicaPorcentajeEntrega, setAplicaPorcentajeEntrega] = useState(false);

  const [puntosCarga, setPuntosCarga] = useState<PuntoCotizacion[]>([{ ubicacionId: null, porcentaje: 100 }]);
  const [puntosEntrega, setPuntosEntrega] = useState<PuntoCotizacion[]>([{ ubicacionId: null, porcentaje: 100 }]);

  const [maniobras, setManiobras] = useState<Maniobras>('incluidas');
  const [montoManiobras, setMontoManiobras] = useState(0);
  const [porcentajeCliente, setPorcentajeCliente] = useState(100);

  const [resultado, setResultado] = useState<CotizacionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    supabase.from('unidades').select('id, nombre').eq('activo', true).order('orden_display')
      .then(({ data }) => setUnidades(data ?? []));
  }, []);

  useEffect(() => {
    if (!unidadId) { setResultado(null); setError(null); return; }
    const hayEntregas = puntosEntrega.some((p) => p.ubicacionId);
    if (!hayEntregas) { setResultado(null); return; }

    const currentId = ++requestIdRef.current;
    (async () => {
      try {
        const res = await calcularCotizacion({
          modalidad, unidadId, destinoId: 0,
          incluirPuntosCarga, aplicaPorcentajeCarga, aplicaPorcentajeEntrega,
          puntosCarga, puntosEntrega, maniobras, montoManiobras,
          diasEstadia: 0, costoPorDia: 0, porcentajeRegreso: 60, porcentajeCliente,
        });
        if (currentId === requestIdRef.current) { setResultado(res); setError(null); }
      } catch (e: any) {
        if (currentId === requestIdRef.current) { setError(e.message); setResultado(null); }
      }
    })();
  }, [modalidad, unidadId, incluirPuntosCarga, aplicaPorcentajeCarga, aplicaPorcentajeEntrega, puntosCarga, puntosEntrega, maniobras, montoManiobras, porcentajeCliente]);

  const updEntrega = (i: number, patch: Partial<PuntoCotizacion>) => { const n = [...puntosEntrega]; n[i] = { ...n[i], ...patch }; setPuntosEntrega(n); };
  const updCarga = (i: number, patch: Partial<PuntoCotizacion>) => { const n = [...puntosCarga]; n[i] = { ...n[i], ...patch }; setPuntosCarga(n); };

  return (
    <div className="cotizador pb-28">
      <h1>Cotizador</h1>

      <div className="apple-card">
        <label className="apple-label">MODALIDAD DEL SERVICIO</label>
        <div className="modality-grid">
          {MODALIDADES.map((m) => (
            <button key={m.id} className={`modality-btn ${modalidad === m.id ? 'active' : ''}`} onClick={() => setModalidad(m.id)}>
              <span>{m.icon}</span><span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="apple-card">
        <label className="apple-label">UNIDAD</label>
        <select value={unidadId ?? ''} onChange={(e) => setUnidadId(Number(e.target.value) || null)}>
          <option value="">Seleccionar unidad...</option>
          {unidades.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
        </select>
      </div>

      <div className="apple-card">
        <div className="flex-between mb-4">
          <label className="apple-label m-0">PUNTOS DE ENTREGA</label>
          <IOSToggle label="Aplicar %" checked={aplicaPorcentajeEntrega} onChange={setAplicaPorcentajeEntrega} />
        </div>
        {puntosEntrega.map((p, i) => (
          <div key={i} className="punto-item mb-2">
            <div className="punto-ubicacion">
              <SelectorUbicacion label="" value={p.ubicacionId} onChange={(id) => updEntrega(i, { ubicacionId: id })} placeholder="Destino..." />
            </div>
            {aplicaPorcentajeEntrega && (
              <div className="punto-pct">
                <input type="number" value={p.porcentaje || ''} onChange={(e) => updEntrega(i, { porcentaje: Number(e.target.value) })} placeholder="%" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="apple-card">
        <IOSToggle label="Incluir Puntos de Carga" checked={incluirPuntosCarga} onChange={setIncluirPuntosCarga} />
        {incluirPuntosCarga && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex-between mb-4">
              <label className="apple-label m-0">PUNTOS DE CARGA</label>
              <IOSToggle label="Aplicar %" checked={aplicaPorcentajeCarga} onChange={setAplicaPorcentajeCarga} />
            </div>
            {puntosCarga.map((p, i) => (
              <div key={i} className="punto-item mb-2">
                <div className="punto-ubicacion">
                  <SelectorUbicacion label="" value={p.ubicacionId} onChange={(id) => updCarga(i, { ubicacionId: id })} placeholder="Origen..." />
                </div>
                {aplicaPorcentajeCarga && (
                  <div className="punto-pct">
                    <input type="number" value={p.porcentaje || ''} onChange={(e) => updCarga(i, { porcentaje: Number(e.target.value) })} placeholder="%" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="apple-card">
        <label className="apple-label">MANIOBRAS</label>
        <div className="radio-vertical mb-4">
          <label className="radio-line"><input type="radio" value="incluidas" checked={maniobras === 'incluidas'} onChange={() => setManiobras('incluidas')} /> Incluidas</label>
          <label className="radio-line"><input type="radio" value="mas" checked={maniobras === 'mas'} onChange={() => setManiobras('mas')} /> Más maniobras</label>
        </div>
        {maniobras === 'mas' && <input type="number" className="apple-input mb-4" value={montoManiobras || ''} onChange={(e) => setMontoManiobras(Number(e.target.value))} placeholder="Monto extra $" />}
        
        <div className="border-t">
          <label className="apple-label">% APLICABLE AL CLIENTE</label>
          <input type="number" className="apple-input" value={porcentajeCliente} onChange={(e) => setPorcentajeCliente(Number(e.target.value))} />
        </div>
      </div>

      {error && <div className="error-box" style={{ background: '#ff3b30', color: 'white', padding: '12px', borderRadius: '12px', marginBottom: '16px' }}>{error}</div>}
      {resultado && <DesgloseCotizacion resultado={resultado} />}
    </div>
  );
}